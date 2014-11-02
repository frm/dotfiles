#!/bin/env ruby

# I've been having some troubles regarding mailing lists
# Basically, in each mail we're sending, we have to add contacts and some are repeated
# And there are always some missing from our contact list
# So, here's a quickly made script that takes a file that should contain the list of the addresses of the last sent email
# And then a list of files with the ones we want to add
# If no flag is given it should print out the ones that aren't included in the existing list (first file)
# With -f it prints the full list
# The given files do not need to have a certain format
# If you copy and paste them from the last email and it has the receiver's name, it will be filtered

require 'set'
require 'optparse'

# Captures multiple emails, even works if they are in the same line
$EMAIL = /(?<email>\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,4}\b)/i

# Set of the existing emails (first file)
$existing_emails = Set.new
# Set of new emails, that don't occur in the first file
$new_emails = Set.new

# Checking for flag existance and capturing the file list
start = {true => 0, false => 1}[ARGV[0].match(/-./).nil?]
$files = ARGV[start..-1]

# This is going to be executed when reading a file with some new emails
get_unique_emails = -> (line) do
  curr_mail = line.match($EMAIL)
  if curr_mail and !$existing_emails.include?(curr_mail[:email])
    $new_emails.add(curr_mail[:email])
  end
end

# Retrieve current email list
File.read(ARGV[start]).each_line do |line|
  m = line.match($EMAIL)
  $existing_emails.add(m[:email]) if m[:email]
end

# Get all emails that aren't on the first list
$files.each do |file|
  File.read(file).each_line(&get_unique_emails)
end

$new_emails.each { |mail| puts mail + "," }

# If -f is given, we're going to print the existing emails too
OptionParser.new do |opts|
  opts.on("-f", "--full", "Print the complete list of unique emails") do |t|
    $existing_emails.each { |mail| puts mail + "," }
  end
end.parse!
