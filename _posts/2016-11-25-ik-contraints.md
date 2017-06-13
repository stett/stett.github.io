---
title: Constraining IK Joints With Arbitrary Geometry
layout: post
tags: [ik]
comments: true
---

The following video demos a system for making geometry based constraints for a CCD solution, based on some of the notes and ideas presented by Jonathan Blow [here](http://number-none.com/product/IK%20with%20Quaternion%20Joint%20Limits/). In the clip, an arm with 15 constrained ball joints tracks a target placed by the mouse. Each joint is constrained by a polygonal geometry approximating a circle, but any convex 2D shape could have been used.

<iframe width="100%" height="315" src="https://www.youtube.com/embed/mkH-GxfQnsQ" frameborder="0" allowfullscreen></iframe>

IK links and constraints can be represented by the following simple structures.

{% highlight c++ %}
struct Constraint {
    std::vector<vec3> vertices;
};

struct Link {
    float length;
    float flexibility;
    quat rotation;
    Constraint constraint;
};
{% endhighlight %}

After a link's transforms are set by an iteration of CCD, a link's `rotation` may violate the constraint and must be rotated back to the constraint primitive. In this scheme, the final and first vertexes of a constraint primitive are connected so that a constraint always forms a loop.

{% highlight c++ %}
void constrain(Link& link) {
    std::vector<vec3>& vertices = link.constraint.vertices;
    for (size_t i = 0; i < vertices.size(); ++i) {

        // Get the next position of the end of this link relative to the constraint
        vec3 next = link.rotation * vec3(link.length, 0.0f, 0.0f);

        // Project the new position onto a vector perpendicular to
        // both this edge of the primitive and the primitive normal.
        int j = (i+1)%vertices.size();
        vec3 u = vertices[j] - vertices[i];
        float insideness = dot(cross(vertices[i], u), next);
        if (insideness < 0.0f) {

            // Compute the closest point on the constraint boundary.
            float a = dot(u, u);
            float b = dot(u, next);
            float c = dot(next, next);
            float d = dot(u, vertices[j]);
            float e = dot(next, vertices[j]);
            float t = (b * e - c * d) / (a * c - b * b);
            vec3 limit = vertices[j] + u * t;

            // Rotate back to the limit
            link.rotation = quat(next, limit) * link.rotation;
        }
    }
}
{% endhighlight %}

The closest-point math is the result of a pen and paper calculation and could stand a bit of optimization. I've left it the way it is to make it a bit easier to see what's going on.

In the last line, the quaternion constructor `quat(next, limit)` is the minimal rotation from the vector `next` to `limit`, something like what Blow presents near the end of his article.