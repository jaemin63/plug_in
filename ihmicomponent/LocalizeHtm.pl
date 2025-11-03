# (C) 2018 FANUC CORPORATION and FANUC America Corporation. All Rights Reserved. 
# 
# All rights in and to this material are expressly reserved by FANUC CORPORATION
# and FANUC America Corporation. Unless otherwise separately agreed to by FANUC 
# CORPORATION or FANUC America Corporation, in no event shall any rights in or 
# to this material, including but not limited to proprietary or intellectual 
# property rights, be transferred or licensed to any other parties.
#

#!/tool/bin/perl

use strict;
use warnings;
use Pod::Usage;
use File::Spec;
use File::Basename;
use Getopt::Long;

my %opt = (lang => "eg",
           help => 0,
           man => 0,
           debug => 0,
          );

my $num_errors = 0;
my $result = GetOptions("out=s"      => \$opt{outfile},
                        "include=s@" => \$opt{include},
                        "language=s" => \$opt{lang},
                        "help"       => \$opt{help},
                        "man"        => \$opt{man},
                        "debug"      => \$opt{debug}) or pod2usage(2);

pod2usage(1) if $opt{help};
pod2usage(-verbose => 2) if $opt{man};

my $in_file = shift or pod2usage(2);

my ($base, $path, $suffix) = fileparse($in_file, qr{\..*});

push @{$opt{include}}, $path;

my $version = 0;
{
  my $vers_file = "/vob/config/version.ht";
  my $os_name = $^O;
  if ($os_name =~ /Win/) {
    $vers_file = "version.ht";
  }
  
  unless (-e $vers_file) {
	print "Unable to open $vers_file, trying at /config\n";
    $vers_file = "/config/version.ht";
  };
  open my $in, "<", $vers_file or die "Unable to open $vers_file";
  while (my $line = <$in>) {
      if ($line =~ m{^ *#define *VERSION *\"([^ ]+) +.*"}) {
          $version = $1;
          last;
      }
  }
  close $in;

  die "Cannot get version from $vers_file.\n" unless $version;
}

my $out_file = $opt{outfile} or pod2usage(2);
open my $out, ">", $out_file or die "Unable to open $out_file";
binmode $out;
open my $in, "<", $in_file or die "Unable to open $in_file";
while (my $line = <$in>) {
  $line = replace_to_localized_text($line);
  $line =~ s{@\@VERSION@@}{$version}ge;
  print $out $line;
}
close $in;

close $out;

if ($num_errors > 0) {
    die "$num_errors errors are found.\n";
}

exit 0;

sub print_error {
    my ($file, $line, $message) = @_;
    $num_errors++;
    warn "'$file' line $line: error: $message\n";
}

sub replace_to_localized_text {
    my ($line) = @_;
    $line =~ s{<!--\s*#echo\s+dict\s*=\s*(\w+)\s+ele\s*=\s*(\w+)\s*-->}{get_localized_text("$1$opt{lang}.utx", $2)}ge;
    $line =~ s{\{\{(\w+)\.(\w+)\}\}}{get_localized_text("$1$opt{lang}.utx", $2)}ge;
    return $line;
}

{
    my %dict_maps;

    sub get_localized_text {
        my ($dict, $elem) = @_;
        if (!defined $dict_maps{$dict}) {
            $dict_maps{$dict} = load_dict($dict);
        }
        my $dict_map = $dict_maps{$dict};

        if (defined $dict_map->{$elem}) {
            return replace_to_localized_text($dict_map->{$elem});
        }
        else {
            print_error($in_file, $., "Undefined element '$elem' in $dict");
            return "";
        }

        sub load_dict {
            my $dict = shift;

            my (%ret, $elem);

            my $file;
            for my $dir (@{$opt{include}}) {
                 $file = File::Spec->catfile($dir, "$dict");
                 last if -e $file;
            }

            if (!-e $file) {
                print_error($in_file, $., "Unable to find dict '$dict'");
            }
            else {
                local $.;

                open my $in, "<", $file or die "Unable to open $file";
                while (my $line = <$in>) {
                    next if $line =~ /^\s*\*/;
                    if ($line =~ m{\$(?:[\d]+|-)\s*,\s*(\w+)}g) {
                        $elem = $1;
                        if (defined $ret{$elem}) {
                            print_error($file, $., "'$elem' is duplicated")
                        }
                        else {
                            next unless $line =~ m{\G\s*(["'])(.*)\1};
                            $ret{$elem} = $2;
                        }
                    }
                    elsif ($line =~ m{^\s*(["'])(.*)\1\s*$}) {
                        $ret{$elem} = "" unless defined $ret{$elem};
                        $ret{$elem} .= $2;
                    }
                }
                close $in;
            }

            return \%ret;
        }
    }
}

__END__

=head1 NAME

LocalizeHtm.pl - localize file using dictionary files

=head1 SYNOPSIS

LocalizeHtm.pl [option ..] file

Options:
  -out <file>         Place the output into <file>
  -language <suffix>  Spefiy the language suffix
  -include <dir>      Add <directory> to the search paths
  -help               Display brief help message

=head1 DESCRIPTION

B<This program> replaces #echo ssi commands with strings from the dictionary file.

The input file is first scanned to find the 6-character dictionary identifer
used in the echo ssi commands.  The dictionary file name is constructed by
appending the language suffix and ".utx" to the dictionary name.

The output file name is constructed from the input file name by appending the
language suffix before the file type.

=head1 AUTHORS

Judy Evans

=head1 COPYRIGHT

Copyright (C) 2011-2014 FANUC Corporation

=head1 HISTORY

12-Aug-2011 Y. Namiki    Allow to localize a html file using multiple dictionary files.
06-Feb-2014 Y. Namiki    Add function to embed version number.

=cut
