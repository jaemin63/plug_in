@echo off
rem (C) 2018 FANUC CORPORATION and FANUC America Corporation. All Rights Reserved. 
rem 
rem All rights in and to this material are expressly reserved by FANUC CORPORATION
rem and FANUC America Corporation. Unless otherwise separately agreed to by FANUC 
rem CORPORATION or FANUC America Corporation, in no event shall any rights in or 
rem to this material, including but not limited to proprietary or intellectual 
rem property rights, be transferred or licensed to any other parties.

rem --- initial setting 0 : no / 1 : yes

rem -- localized js?1:localized 0:no localized
set isLocalizedJs=0

rem ------------------------------------------

cd %~dp0

for %%1 in ("%2") do set wkdir=%%~nx1

set commondir="%~dp0\ihmicomponent"
if "%~1"=="" (
  set "indir=%~dp0src"
  set iplfile=output
) else (
  set "indir=%~1"
  set "iplfile=%~n1"
)
set outdir="%~dp0\output"
set tmpdir="%~dp0\temp"

rem --- renew outRobot folder
if not exist %tmpdir% mkdir %tmpdir%
if exist %outdir% rmdir /s /q %outdir%
if exist %iplfile%.ipl del %iplfile%.ipl
mkdir %outdir%

setlocal ENABLEDELAYEDEXPANSION

rem --- check utx language types
cd %indir%
rem   --- default language ---
set language[0]=eg
set language[1]=kn
set language[2]=ch
set lng_count=3
set /a utx_serch_end=%lng_count%-1

for /r %%i in (*eg.utx) do (
  set file=%%~ni

  rem search kn.utx,ch.utx
  for /l %%n in (1,1,!utx_serch_end!) do (
    set utxfile=!file:~0,-2!!language[%%n]!.utx
    set findutxflg=0
    for /r %%k in (*!language[%%n]!.utx) do (
      set serchfile=%%~nxk
      if !serchfile!==!utxfile! (
        rem find kn or ch utx
        set findutxflg=1
      )
    )
    if !findutxflg!==0 (
      rem not find, copy kn.utx or ch.utx from eg.utx.
      copy "%%~fi" %tmpdir%\ > nul
      ren %tmpdir%\%%~nxi !utxfile!
    )
  )
)

for /r %%i in (*.utx) do (
  set type=%%~ni
  set type=!type:~-2!
  set flg=0
  for /l %%n in (0,1,!lng_count!) do (
    if !language[%%n]!==!type! (set flg=1)
  )
  if !flg!==0 (
    rem add lang other than eg,kn,ch
    set language[!lng_count!]=!type!
    set /a lng_count = !lng_count!+1
  )
)
if not %lng_count%==0 ( set /a lng_count=%lng_count%-1 )

rem ---- copy project file ----
for /r %%i in (*.*) do (
	rem -- extension check --
	set chkext=%%~xi
  set result=0
  if !chkext!==.utx set result=1
  if !chkext!==.vut set result=1
  if !chkext!==.ishtm set result=1
  if !chkext!==.shtm set result=1
  if !chkext!==.lxml set result=1
  if !chkext!==.ihtml set result=1
  if !chkext!==.hhtm set result=1
	if %isLocalizedJs%==1 if !chkext!==.js set result=1
	
	rem -- result is 1 => copy temp folder or result is 0 => copy outRobot folder
	if !result!==1 ( copy "%%~fi" %tmpdir%\ > nul ) else ( copy "%%~fi" %outdir%\ > nul )
)

cd %commondir%

rem --- copy ihmicomponent file
copy %commondir%\*.utx %tmpdir% > nul
copy %commondir%\*.vut %tmpdir% > nul

rem ---- build in temp folder ----

rem --- for ishtm
for %%i in (%tmpdir%\*.ishtm) do (
  echo convert ssl ihmi tag to html tag [%%~nxi]
  call perl %commondir%\embeduifcomponents.pl -o ..\temp\%%~ni.shtm ..\temp\%%~nxi
)

rem --- for shtm
for %%i in (%tmpdir%\*.shtm) do (
  echo | set /p="stm file created ( "
  for /l %%n in (0,1,%lng_count%) do (
    echo | set /p="!language[%%n]!, "
    call perl %commondir%\LocalizeHtm.pl -L !language[%%n]! -o ..\output\%%~ni!language[%%n]!.stm ..\temp\%%~nxi
  )
  echo ^) from [%%~nxi].
)

rem --- for lxml
for %%i in (%tmpdir%\*.lxml) do (
  echo | set /p="xml file created ( "
  for /l %%n in (0,1,%lng_count%) do (
    echo | set /p="!language[%%n]!, "
    call perl %commondir%\LocalizeHtm.pl -L !language[%%n]! -o ..\output\%%~ni!language[%%n]!.xml ..\temp\%%~nxi
  )
  echo ^) from [%%~nxi].
) 

rem --- for ihtml 
for %%i in (%tmpdir%\*.ihtml) do (
  echo convert ihmi tag to html tag [%%~nxi]
	call perl %commondir%\embeduifcomponents.pl -o ..\temp\%%~ni.hhtm ..\temp\%%~nxi
)

rem --- for hhtm
for %%i in (%tmpdir%\*.hhtm) do (
  echo | set /p="htm file created ( "
  for /l %%n in (0,1,%lng_count%) do (
    echo | set /p="!language[%%n]!, "
	  call perl %commondir%\LocalizeHtm.pl -L !language[%%n]! -o ..\output\%%~ni!language[%%n]!.htm ..\temp\%%~nxi
  )
  echo ^) from [%%~nxi].
)

rem --- js
if %isLocalizedJs%==1 (
  echo | set /p="js file created ( "
  for /l %%n in (0,1,%lng_count%) do (
    echo | set /p="!language[%%n]!, "
	  call perl %commondir%\LocalizeHtm.pl -L !language[%%n]! -o ..\output\%%~ni!language[%%n]!.js ..\temp\%%~nxi
  )
  echo ^) from [%%~nxi].
)

rmdir /s /q %tmpdir%
echo *** ihmi build finished. ***

rem --- compress ipl(zip) ---

cd %outdir%

rem --- create compress file list
 set flg=0
for /r %%i in (*.*) do (
  set files1=!files1!,%%~nxi
  set files2=!files2! %%~nxi
  set flg=1
)
if %flg%==1 set files1=%files1:~1%
if %flg%==1 set files2=%files2:~1%

rem set SEVENZ_PATH=""
rem if exist %commondir%\build.ini (
rem   for /f "delims== tokens=1,2" %%i in (%commondir%\build.ini) do (
rem     set %%i=%%j
rem   )
rem   !SEVENZ_PATH! a %tmpdir%.zip %files2%
rem   if exist %tmpdir%.zip (
rem     rename %tmpdir%.zip "%iplfile%.ipl"
rem     goto PROCESS_COMP
rem   )
rem )

rem if exist %commondir%\build.ini del %commondir%\build.ini

powershell Get-Command *Archive > check.txt
set check_flg=0
for /f %%a in (check.txt) do (
  if not %%a=="" set check_flg=1
)
del check.txt
if %check_flg%==1 (
  powershell Compress-Archive -Path %files1% -DestinationPath ..\output.zip -Force
  if exist ..\output.zip (rename ..\output.zip "%iplfile%.ipl")
  goto PROCESS_COMP
)

rem echo Please drag and drop the path of 7z.exe used for compression.
rem set /P lpath="path:"

rem echo SEVENZ_PATH=%lpath% > %commondir%\build.ini
rem %lpath% a %tmpdir%.zip %files2%
rem if exist %tmpdir%.zip (
rem   rename %tmpdir%.zip "%iplfile%.ipl"
rem   goto PROCESS_COMP
rem )

:RPOCESS_FAIL
  echo ---COMPRESS ERROR--- Failed to create compressed file.
  pause
  exit /b

:PROCESS_COMP
  echo *** compress ipl finished. ***

  rem --- copy ipl file to target directory ---
  set TARGET_DIR=C:\Users\i0215478\Documents\My Workcells\CncguideConnectTest\Robot_1\UD1

  if exist ..\%iplfile%.ipl (
    echo Copying %iplfile%.ipl to %TARGET_DIR%...
    copy /Y ..\%iplfile%.ipl "%TARGET_DIR%\" > nul
    if %errorlevel%==0 (
      echo *** ipl file copied successfully to %TARGET_DIR% ***
    ) else (
      echo *** ERROR: Failed to copy ipl file to %TARGET_DIR% ***
    )
  ) else (
    echo *** WARNING: %iplfile%.ipl not found, skipping copy. ***
  )
