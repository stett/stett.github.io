---
title: Using Django Fixtures for Practical Site Instantiation
layout: post
tags: django
comments: true
---

When using Django, it is useful and sometimes necessary to install the [Sites Framework](https://docs.djangoproject.com/en/1.7/ref/contrib/sites/). However, it's a bit inconvenient to have to create a new Site object when creating new deployments of a project, especially if you want multiple deployments with different domains (ie. dev, stage, prod, etc).

The problem is slightly exacerbated when the `SITE_ID` setting must be lined up with the `pk` of the Site that you want to use, since your `settings.py` or settings directory hierarchy is most likely versioned.

What I've started doing to alleviate the problem a bit is to instantiate at least one site in my main app's `fixtures/initial_data.json` file.

{% highlight javascript %}
// mainapp/initial_data.json
[
    {
        "model": "sites.Site",
        "pk": 1,
        "fields": {
            "name": "Site Title",
            "domain": "the-site.com"
        }
    }
]
{% endhighlight %}

And in your settings file,

{% highlight python %}
# settings.py
SITE_ID = 1
{% endhighlight %}

When you run `python manage.py migrate`, the site will be automatically created.

This may be considered by some to be somewhat counter to good practice, since we are now storing domain-specific information in site code. I count this transgression to be minimal, however, compared to the convenience it provides, specifically for projects where separate settings files are used for different deployments, and where `SITE_ID` must be set anyway.
