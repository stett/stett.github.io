---
layout: base
---

{% for post in site.posts %}
<span  class="date">{{ post.date|date:"%Y/%m/%d" }}</span>
[{{ post.title }}]({{ post.url }})
<span class="tags">
    {% for tag in post.tags %}{{ tag }}{% if forloop.last == false %}, {% endif %}{% endfor %}
</span>
{% endfor %}
