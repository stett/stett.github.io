{% include js/sceneactor.js %}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++)
    {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

class GlobalImplicitSolver extends DRAMA.Actor
{
    constructor(container)
    {
        super();

        // Add a scene
        this.sceneActor = new SceneActor(container, 20);
        DRAMA.add(this.sceneActor);

        // Physical global parameters
        this.min_dt = 1/120;
        this.max_dt = 1/30;
        this.time = Date.now();
        this.density = 1;

        // Initialize state arrays
        this.state = [];
        this.radii  = [];
        this.masses = [];
        this.meshes = [];
        this.constraints = [];

        // Add some particles
        this.addParticle(-20,-5,1);
        this.addParticle(-10,-5,2);
        this.addParticle(0,-5,3);
        this.addParticle(10,-5,4);
        this.addParticle(20,-5,5);
        this.addParticle(-20,5,5);
        this.addParticle(-10,5,4);
        this.addParticle(0,5,3);
        this.addParticle(10,5,2);
        this.addParticle(20,5,1);

        /*
        {
            const geometry = new THREE.SphereGeometry(20);
            const material = new THREE.MeshBasicMaterial({ color: "#00ADDF" });
            var sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(0, 0, 0);
            this.sceneActor.scene.add(sphere);
        }
        */
    }

    update()
    {
        // Get delta time
        const time_now = Date.now();
        const dt = Math.min(Math.max(time_now - this.time, this.min_dt), this.max_dt);
        this.time = time_now;

        // Forward integrate
        //
        // TEMP
        //
        for (let i = 0; i < this.meshes.length; i++)
        {
            const ix = 4*i;
            const iy = ix+1;
            const ivx = ix+2;
            const ivy = ix+3;

            // Integrate velocities
            this.state[ix] += this.state[ivx] * dt;
            this.state[iy] += this.state[ivy] * dt;
        }

        // Update positions of meshes
        for (let i = 0; i < this.meshes.length; i++)
        {
            const ix = 4*i;
            const iy = ix+1;
            this.meshes[i].position.set(this.state[ix], this.state[iy], 0);
        }
    }

    addParticle(x, y, r)
    {
        // Compute the mass from the radius
        // 2d:
        const m = Math.PI * r * r * this.density;
        // 3d:
        // const mass = Math.PI * r * r * r * (4/3) * this.density;

        // Compute a random velocity
        const max_vel = 3;
        const vang = Math.random() * 2 * Math.PI;
        const vmag = Math.random() * max_vel;
        const vx = Math.cos(vang) * vmag;
        const vy = Math.sin(vang) * vmag;

        // Set up particle property arrays
        this.radii.push(r);
        this.state.push(x);
        this.state.push(y);
        this.state.push(vx);
        this.state.push(vy);
        this.masses.push(m);

        // Add a mesh
        const geometry = new THREE.SphereGeometry(r);
        const material = new THREE.MeshBasicMaterial({ color: getRandomColor() });
        var sphere = new THREE.Mesh(geometry, material);
        sphere.position.set(x, y, 0);
        this.sceneActor.scene.add(sphere);
        this.meshes.push(sphere);

        // Return the index of the new mesh
        return this.meshes.length - 1;
    }
};
