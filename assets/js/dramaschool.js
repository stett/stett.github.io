var DRAMA = DRAMA || {
    Actor: class {
        constructor() {}
        update() {}
    },

    add: function(newActor) {
        DRAMA.actors.push(newActor);
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
