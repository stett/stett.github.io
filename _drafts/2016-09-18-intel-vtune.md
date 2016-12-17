---
title: Two Notes About VTune Amplifier
layout: post
tags: [concurrency testing]
comments: true
---

I recently started using [Intel VTune Amplifier](https://software.intel.com/en-us/intel-vtune-amplifier-xe/) to do concurrency performance analytics, and I have two notes that may be useful to someone who's new to it.

1. Always build in release before running your multithreaded analysis. Otherwise MSVC will basically destroy all of your concurrency with debug stuff.

2. Don't use `std::this_thread::sleep_for(...)` for dummy operations. Do some actual work instead.