---
title: Cumulative Git User Statistics
layout: post
tags: [git, c++]
comments: true
---

### The Problem

The problem is that git provides no simple way to print a cumulative report of changes which can be easily filtered by author or date range.

The following code is a short C++ script to parse the output of `git log --numstat --pretty="%n"`, sum the insertions and deletions for each file, and print a summary. It was written in heed of [this advice](http://stackoverflow.com/a/1265229/1432965).

Check out my code below, or download the gist [here](https://gist.githubusercontent.com/stett/14fc781cffd90bebde51/raw/5c3a2f9a4523d822c5610efafe875feb0697211d/accum.cpp).

{% highlight c++ %}
/*
    This is a command-line program to sum up and print all
    line insertions and deletions listed by the statistical
    git log command. Where "accum" is the compiled program,
    it can be used with a "|" as follows:

        git log --numstat --pretty="%n" | accum

    Git log results may be filtered by a number of parameters.
    Notably, the --author="..." and --since="../../...." can be
    used to count all insertions and deletions by a specific
    author within a range of time. More here:
    https://git-scm.com/docs/git-log.

    02-29-2015: Thus far it has only been tested on Cygwin,
                built with g++, with the -std=c++0x flag.
*/

#include <iostream>
#include <sstream>
#include <string>
#include <map>
#include <utility>
#include <iomanip>

int main(int argc, char **argv) {

    int max_empty_lines = 15;
    int num_empty_lines = 0;

    std::map< std::string, std::pair<int, int> > changes;

    do {

        // Grab the next line
        std::string line;
        std::getline(std::cin, line);

        // If it's empty, increment the empty counter and skip to the next iteration
        if (line.empty()) {
            num_empty_lines ++;
            continue;
        } else {
            num_empty_lines = 0;
        }

        // Turn the line into a stream
        std::stringstream stream(line);

        // Get this chunk of the report
        int insertions;
        int removals;
        std::string file;
        while (
            (stream >> insertions) && 
            (stream >> removals) && 
            (stream >> file)) {

            // Make an empty entry for this file if there isn't one already
            if (changes.find(file) == changes.end())
                changes[file] = std::pair<int, int>(0, 0);

            // Save this insertion/removal count pair in the map
            changes[file].first += insertions;
            changes[file].second += removals;
        };

    } while (num_empty_lines < max_empty_lines);


    // Print the final report
    int total_insertions = 0;
    int total_deletions = 0;
    for (auto change : changes) {
        std::cout << std::left << std::setw(60) << change.first << "+" << std::setw(5) << change.second.first << "-" << std::setw(5) << change.second.second << "\n";
        total_insertions += change.second.first;
        total_deletions += change.second.second;
    }
    std::cout << "\n";
    std::cout << "Total Insertions: " << total_insertions << "\n";
    std::cout << "Total Deletions:  " << total_deletions << "\n";
}
{% endhighlight %}