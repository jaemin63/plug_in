# (C) 2018 FANUC CORPORATION and FANUC America Corporation. All Rights Reserved. 
# 
# All rights in and to this material are expressly reserved by FANUC CORPORATION
# and FANUC America Corporation. Unless otherwise separately agreed to by FANUC 
# CORPORATION or FANUC America Corporation, in no event shall any rights in or 
# to this material, including but not limited to proprietary or intellectual 
# property rights, be transferred or licensed to any other parties.

#!/tool/bin/perl

use warnings;
use strict;
use Data::Dumper;
use Getopt::Long;
use Pod::Usage;
use File::Spec;
use File::Basename;

my @ssi_commands = qw{if else endif};

my %opt = (help => 0,
           man => 0,
           debug => 0
          );

my $result = GetOptions("out=s"      => \$opt{outfile},
                        "include=s@" => \$opt{include},
                        "help"       => \$opt{help},
                        "man"        => \$opt{man},
                        "debug"      => \$opt{debug}) or pod2usage(2);

pod2usage(1) if $opt{help};
pod2usage(-verbose => 2) if $opt{man};

my $in_file = shift or pod2usage(2);
my $out_file = $opt{outfile} or pod2usage(2);

my $num_errors = 0;

sub syntax_error {
    my ($file, $line, $message) = @_;
    $num_errors++;
    warn "'$file' line $line: error: $message\n";
}

my %templates;
{ # parse template files and construct %template
    unshift @{$opt{include}}, dirname($in_file);

    warn Dumper $opt{include} if $opt{debug};

    my @vut_files;
    for my $dir (@{$opt{include}}) {
        die "Invalid directory name $dir\n" unless -d $dir || -e $dir;
        push @vut_files, glob(File::Spec->catfile($dir, "*.vut"));
    }

    warn Dumper \@vut_files if $opt{debug};;

    for my $vut (@vut_files) {
        my $templates = parse_templates($vut);
        %templates = (%templates, %{$templates}); # merge templates
    }

    warn Dumper \%templates if $opt{debug};
}

# embed uif components in a html file
my $lines = embed_uifcomponents($in_file, \%templates);

open my $fh, ">", $out_file or die "Unable to open $out_file";
print $fh $lines;
close $fh;

if ($num_errors > 0) {
    die "$num_errors errors are found.\n";
}

exit 0;

{ # functions to parse html file
    my ($curr_file, $curr_line);
    my @order_configs;

    sub embed_uifcomponents {
        my ($file, $templates) = @_;

        my $lines = get_lines($file);
        my $num_lines = ($lines =~ tr{\n}{\n});
        my $tag_type = get_tag_type($lines, $templates);
        $curr_file = $file;

        $lines = embed_uifcomponents_reccursive($lines, $templates);

        my $num_tags = ($lines =~ s{</body>}{</body>}g);
        if ($num_tags == 0) {
            html_error("There is no </body> tag.", $num_lines);
        }
        elsif ($num_tags > 1) {
            html_error("There are multiple </body> tags.", $num_lines);
        }

        $lines =~ s{(</body>)}{initialization_code($tag_type) . $1}e;

        $lines =~ s{\n\s*\n}{\n}g;
        return $lines;

        ########## inner subroutines ##########
        sub html_error {
            my ($message, $line_num) = @_;
            $line_num = $curr_line unless defined $line_num;
            syntax_error($curr_file, $line_num, $message);
        }

        sub initialization_code {
            my ($tag_type) = @_;
            my $script = "";
            my ($webpage, undef, undef) = fileparse($curr_file, qr{\.[^.]+$});
            for my $config (@order_configs) {
                if (exists $config->{id}) { # ssi line
                    my $id = $config->{id};
                    my $type = $config->{type};
                    delete $config->{id};
                    delete $config->{type};
                    $script .= "init(doc, '$type', '$id', " . toJSON($config) . ");\n";
                }
                else {
                    $script .= $config->{line} . "\n";
                }
            }
            if ($tag_type eq "ihmi") {
                return <<"SCRIPT_IHMI";
<script>
var webpage = '$webpage';
var doc = document;
var init = top.IHMIComponents.cf.initComponents;
$script
</script>
SCRIPT_IHMI
            }
            else{
                return <<"SCRIPT";
<script>
var webpage = '$webpage';
var doc = document;
var init = top.initComponents;
$script
</script>
SCRIPT
            }


            sub toJSON {
                my $config = shift;
                my $json = "";
                for my $key (sort keys %$config) {
                    (my $escaped_value = $config->{$key}) =~ s{'}{\\'}g;
                    if ($key eq 'class') {
                        $key = 'className';
                    }
                    $json .= "'$key':'$escaped_value',";
                }
                $json =~ s{,$}{};
                return "{$json}";
            }
        }

        sub extract_ssi {
            my ($lines) = @_;
            my @ssi;

            while (my $pos = extract_tagged(\$lines, qr{<!-- *#}, qr{-->})) {
                if (!defined $pos->{closetag}) {
                    my $open_tag = substr($lines, $pos->{opentag});
                    html_error("Mismatch ssi command '$open_tag'");
                }
                else {
                    my ($before, $open, $content, $close, $after) = get_tagged_texts(\$lines, $pos);
                    my ($command) = $content =~ m{^ *(\w+) +};
                    if (grep { $command eq $_ } @ssi_commands) {
                        push @ssi, { command => $command, line => ($open . $content . $close) };
                    }
                }
            }
            return @ssi;
        }

        sub embed_uifcomponents_reccursive {
            my ($in_lines, $templates, $parent_config) = @_;
            my ($out_lines, $remaining_lines);

            # remove comments
            if (!defined $parent_config) {
                $out_lines = "";
                $remaining_lines = $in_lines;
                while (my $pos = extract_tagged(\$in_lines, qr{<!--(?! *[#[])}, qr{-->})) {
                    $curr_line = line_num_at_pos(\$in_lines, $pos->{opentag});
                    if (!defined $pos->{closetag}) {
                        html_error("Mismatch comments");
                    }
                    else {
                        my ($before, $open_tag, $content, $close_tag, $after) = get_tagged_texts(\$in_lines, $pos);
                        $out_lines .= $before;
                        $remaining_lines = $after;
                    }
                }
                $out_lines .= $remaining_lines;

                $in_lines = $out_lines;
            }

            # extract ihmi & vuif tags
            $out_lines = "";
            $remaining_lines = $in_lines;
            while (my $pos = extract_tagged(\$in_lines, qr{<(?:ihmi|vuif)(?:[^">]+|"[^"]*")*>}, qr{</(?:ihmi|vuif)>})) {
                if (!defined $parent_config) {
                    $curr_line = line_num_at_pos(\$in_lines, $pos->{opentag});
                }
                if (!defined $pos->{closetag}) {
                    html_error("Unable find close tag");
                }
                else {
                    my ($before, $open_tag, $content, $close_tag, $after) = get_tagged_texts(\$in_lines, $pos);

                    my $config = parse_config($open_tag);
                    $config->{body} = $content;

                    my $type = $config->{type};

                    if    (!defined $type || $type eq "") { html_error("Property 'type' is not specified"); }
                    elsif (!defined $templates->{$type})  { html_error("Template '$type' is not defined"); }
                    else {
                        my $converted = fill_template($config, $templates->{$type});

                        delete $config->{body};

                        push @order_configs, extract_ssi($before);

                        if (exists $config->{id}) {
                            if (defined $parent_config &&
                                exists $parent_config->{id} &&
                                $parent_config->{id} eq $config->{id}) {
                                # merge config
                                delete $config->{id};
                                delete $config->{type};
                                @$parent_config{keys %$config} = values %$config;

                                $config = $parent_config;
                            }
                            else {
                                push @order_configs, $config;
                            }
                        }

                        $out_lines .= $before;
                        $out_lines .= embed_uifcomponents_reccursive($converted, $templates, $config);
                    }
                    $remaining_lines = $after;
                }
            }

            push @order_configs, extract_ssi($remaining_lines);

            $out_lines .= $remaining_lines;

            return $out_lines;
        }

        sub get_tag_type {
            my ($in_lines, $templates) = @_;
            my $tag;
            
            # extract ihmi & vuif tags
            while (my $pos = extract_tagged(\$in_lines, qr{<(?:ihmi|vuif)(?:[^">]+|"[^"]*")*>}, qr{</(?:ihmi|vuif)>})) {
              if (!defined $pos->{closetag}) {
                html_error("Unable find close tag");
              }
              else {
                my ($before, $open_tag, $content, $close_tag, $after) = get_tagged_texts(\$in_lines, $pos);
                $tag = $close_tag;
                last;
              }
            }
            
            if ($tag =~ /ihmi/){
              return "ihmi";
            }
            else {
              return "vuif";
            }
        }

        sub fill_template {
            my ($config, $template) = @_;
            my $out_lines = "";
            for my $item (@{$template}) {
                if (ref $item eq 'ARRAY') {
                    my ($control, $name) = @{$item->[0]};
                    if ($control eq 'if' && defined $config->{$name}) {
                        $out_lines .= fill_template($config, [@{$item}[1..(scalar(@$item) - 1)]]);
                    }
                }
                else {
                    my $text = $item; # copy $item to $text
                    $text =~ s{\$\(([^)]+)\)}
                              {
                                  if (defined $config->{$1}) {
                                      $config->{$1};
                                  }
                                  else {
                                      html_error("Property '$1' is not specified");
                                      "$($1)";
                                  }
                              }ge;
                    $out_lines .= $text;
                }
            }

            return $out_lines;
        }

        sub parse_config {
            my $tag = shift;
            my %config;
            if (my ($config) = $tag =~ m{^<(?:ihmi|vuif)((?:\s+\w+="[^"]*")*)\s*>$}) {
                %config = $config =~ m{\s+(\w+)="([^"]*)"*}g;
            }
            else {
                html_error("Invalid tag '$tag'");
            }
            return \%config;
        }
    }
}

{ # functions to parse template file
    my ($curr_file, $curr_line);

    sub parse_templates {
        my $file = shift;

        $curr_file = $file;
        $curr_line = 0;

        my $lines = get_lines($file);

        $lines =~ s{[ \t]*//[^\n]*\n}{\n}g; # remove comments

        my %ret;
        my $start_pos = 0;
        while (my (undef, $control, $name, $pos) = extract_special_tag(\$lines, $start_pos)) {
            if ($control ne "template") {
                template_error("Invalid keyword $control");
            }
            else {
                $ret{$name} = parse_template(\$lines, $pos->{content}, $pos->{closetag} - 1);
            }
            $start_pos = $pos->{after};
        }
        return \%ret;

        ########## inner subroutines ##########
        sub template_error {
            my $message = shift;
            syntax_error($curr_file, $curr_line, $message);
        }

        sub parse_template {
            my ($lines_ref, $start_pos, $end_pos) = @_;
            my @ret;
            while (my ($before, $control, $name, $pos) = extract_special_tag($lines_ref, $start_pos, $end_pos)) {
                if ($control ne "if") {
                    template_error("Invalid keyword $control");
                }
                else {
                    $before =~ s{^\s+}{};
                    push @ret, $before if length $before > 0;
                    push @ret, [[$control, $name], @{ parse_template($lines_ref, $pos->{content}, $pos->{closetag} - 1) }];
                }
                $start_pos = $pos->{after};
            }
            my $after = substr $$lines_ref, $start_pos, $end_pos + 1 - $start_pos;
            $after =~ s{\s+$}{};
            push @ret, $after if length $after > 0;

            return \@ret;
        }

        sub extract_special_tag {
            my ($lines_ref, $start_pos, $end_pos) = @_;
            if (my $pos = extract_tagged($lines_ref, qr{<%\s*[\w\s]*\s*%>}, qr{<%\s*end\s*%>}, $start_pos, $end_pos)) {
                $curr_line = line_num_at_pos($lines_ref, $pos->{opentag});

                if (!defined $pos->{closetag}) {
                    template_error("Unable find close tag");
                }
                else {
                    my ($before, $open_tag, $content, $close_tag) = get_tagged_texts($lines_ref, $pos);
                    if (my ($control, $name) = $open_tag =~ m{<%\s*(\w+)\s+(\w+)\s*%>}) {
                        return ($before, $control, $name, $pos);
                    }
                    else {
                        template_error("Invalid tag '$open_tag'");
                    }
                }
            }
            return;
        }
    }
}

sub get_lines {
    my $file = shift;
    open my $in, "<", $file or die "Cannot open $file: $!\n";
    my $lines = do { local $/; <$in> };
    close $in;
    return $lines;
}

sub line_num_at_pos {
    my ($lines_ref, $pos) = @_;
    my $lines = substr $$lines_ref, 0, $pos;
    my $line_num = 0;
    $line_num = $lines =~ tr{\n}{\n}; # count newline characters
    return $line_num + 1;
}

sub get_tagged_texts {
    my ($lines_ref, $pos_ref) = @_;
    return (
            substr($$lines_ref, $pos_ref->{before},   $pos_ref->{opentag}  - $pos_ref->{before}),
            substr($$lines_ref, $pos_ref->{opentag},  $pos_ref->{content}  - $pos_ref->{opentag}),
            substr($$lines_ref, $pos_ref->{content},  $pos_ref->{closetag} - $pos_ref->{content}),
            substr($$lines_ref, $pos_ref->{closetag}, $pos_ref->{after}    - $pos_ref->{closetag}),
            substr($$lines_ref, $pos_ref->{after}),
           );
}

sub extract_tagged {
    #ここで引数を@_で受け取る
    my ($lines_ref, $open_tag, $close_tag, $start_pos, $end_pos) = @_;

    my %positions;

    if (defined $start_pos) {
        pos($$lines_ref) = $start_pos;
    }
    elsif (!defined pos($$lines_ref)) {
        pos($$lines_ref) = 0;
    }

    if (!defined $end_pos) {
        $end_pos = length($$lines_ref);
    }

    $positions{before} = pos($$lines_ref);

    return unless $$lines_ref =~ m{\G.*?(?=$open_tag)}gcs;

    $positions{opentag} = pos($$lines_ref);

    return unless $$lines_ref =~ m{\G$open_tag}gc;

    return if pos($$lines_ref) > $end_pos;
    $positions{content} = pos($$lines_ref);

    while (pos($$lines_ref) < $end_pos) {
        if ($$lines_ref =~ m{\G($close_tag)}gc ) {
            if (pos($$lines_ref) <= $end_pos) {
                $positions{closetag} = pos($$lines_ref) - length($1);
                $positions{after} = pos($$lines_ref);
                last;
            }
        }
        elsif ($$lines_ref =~ m{\G($open_tag)}gc) {
            my $tag = $1;
            if (pos($$lines_ref) <= $end_pos) {
                # match until nested end tag
                my $pos = extract_tagged($lines_ref, $open_tag, $close_tag, pos($$lines_ref) - length($tag), $end_pos);
                last unless defined $pos->{closetag};
            }
        }
        else {
            $$lines_ref =~ m{.}gcs;
        }
    }
    return \%positions;
}

__END__

=head1 NAME

embeduifcomponents.pl - embed vision uif components in a html file.

=head1 SYNOPSIS

embeduifcomponents.pl [option ..] file

Options:
  -out <file>         Place the output into <file>
  -include <dir>      Add <directory> to the search paths
  -help               Display brief help message

=head1 DESCRIPTION

B<This program> embed vision uif components in a html file.

First, template files with an extension .vut are searched from the search paths.
The found template files are parsed and each template is stored internally.

Next, the input file is scanned to find <ihmi> and <vuif> tags.
The <ihmi> and <vuif> tags are replaced with corresponding template extracted from the template files previously.

Last, script to initialize uif component is written before the </body> tag.

=head1 AUTHORS

Yuta Namiki

=head1 COPYRIGHT

Copyright (C) 2011 FANUC Corporation

=head1 HISTORY

12-Aug-2011 Y. Namiki    Initial creation.
03-Dec-2012 Y. Namiki    Fixed for SSI syntax.
27-Sep-2016 Y. Namiki    Change "class" to "className" when config is output to JSON.

=cut
