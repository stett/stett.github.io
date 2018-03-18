var DRAMA = DRAMA || {
    Actor: class {
        constructor() {}
        update() {}
    },

    actorId: 0,

    add: function(newActor) {
        if (newActor) {
            newActor.id = DRAMA.actorId;
            DRAMA.actorId += 1;
            DRAMA.actors.push(newActor);
        } else {
        }
    },

    remove: function(oldActor) {
        var newActors = [];
        for (var i = 0; i < DRAMA.actors.length; ++i) {
            var actor = DRAMA.actors[i];
            if (actor.id != oldActor.id) {
                newActors.push(actor);
            }
        }
    },

    actors: [],

    update: function() {
        requestAnimationFrame( DRAMA.update );
        for (var i = 0, len = DRAMA.actors.length; i < len; ++i) {
            DRAMA.actors[i].update();
        }
    }
};

$(document).ready(function() {
    DRAMA.update();
});
