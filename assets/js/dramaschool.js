var DRAMA = DRAMA || {
    Actor: class {
        constructor() {}
        update() {}
    },

    add: function(newActor) {
        if (newActor) {
            DRAMA.actors.push(newActor);
        } else {
            console.log("Cannot add actor: " + newActor);
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
