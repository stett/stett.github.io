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

class SparseSquareMatrix
{
    constructor()
    {
        this.rows = Array(0);
    }

    size()
    {
        return this.rows.length;
    }

    get(row, col)
    {
        return this.rows[row][col];
    }

    set(row, col, val)
    {
        this.rows[row][col] = val;
    }

    set_range(row, col, val_rows)
    {
        for (let i = 0; i < val_rows.length; ++i)
        {
            for (let j = 0; j < val_rows[i].length; ++j)
            {
                if (row + i > this.rows.length)
                {
                    add(row + i - this.rows.length);
                }
                if (col + j > this.rows[row + i].length)
                {
                    add(col + j - this.rows[row + i].length);
                }

                this.rows[row + i][col + j] = val_rows[i][j];
            }
        }
    }

    // Add a number of rows and columns, return the index to the first
    // row-column added
    add(num)
    {
        const old_rows = this.rows;
        const old_size = this.rows.length;
        const new_size = old_size + num;
        this.rows = Array(new_size);

        // Copy all old rows into the new rows array, increasing their height by num
        var i = 0;
        for (; i < old_size; ++i)
        {
            this.rows[i] = Array(new_size);
            var j = 0;
            for (; j < old_size; ++j)
            {
                this.rows[i][j] = old_rows[i][j];
            }
            for (; j < new_size; ++j)
            {
                this.rows[i][j] = 0;
            }
        }

        // Add num columns
        for (; i < new_size; ++i)
        {
            this.rows[i] = Array(new_size);
            for (let j = 0; j < new_size; ++j)
            {
                this.rows[i][j] = 0.;
            }
        }

        return old_size;
    }

    apply(vec)
    {
        if (vec.length != this.rows.length)
        {
            throw "Vector length must match matrix size"
            return vec;
        }

        // Initialize a vector of zeros
        var out = Array(vec.length);
        out.fill(0);

        // Perform the matrix vector product
        for (let i = 0; i < this.rows.length; ++i)
        {
            for (let j = 0; j < this.rows.length; ++j)
            {
                out[i] += this.rows[i][j] * vec[j];
            }
        }

        return out;
    }

    populate_from_inverse(other_matrix)
    {
        // Resize if needed
        if (this.size() != other_matrix.size())
        {
            this.rows = [];
            this.add(other_matrix.size());
        }

        // For now, just copy, don't actually invert
        for (let i = 0; i < this.rows.length; ++i)
        {
            for (let j = 0; j < this.rows.length; ++j)
            {
                this.rows[i][j] = other_matrix.rows[i][j];
            }
        }
    }
};

class GlobalImplicitSolver extends DRAMA.Actor
{
    constructor(container)
    {
        super();

        // Add a scene
        this.sceneActor = new SceneActor(container, 20);
        DRAMA.add(this.sceneActor);

        // Physical global parameters
        this.min_dt = 1/100000;
        this.max_dt = 1/30;
        this.fixed_dt = 1/30;
        this.accumulated_dt = 0;
        this.time = Date.now();
        this.density = 1;

        // Initialize state arrays
        this.state = [];
        this.radii  = [];
        this.masses = [];
        this.meshes = [];
        this.constraints = [];
        this.transform_inv = new SparseSquareMatrix();
        this.transform = new SparseSquareMatrix();

        // Add some particles
        this.addParticle(-20, -5, 1);
        //this.addParticle(-10,-5,2);
        //this.addParticle(0,-5,3);
        //this.addParticle(10,-5,4);
        //this.addParticle(20,-5,5);
        //this.addParticle(-20,5,5);
        //this.addParticle(-10,5,4);
        //this.addParticle(0,5,3);
        //this.addParticle(10,5,2);
        //this.addParticle(20,5,1);
    }

    update()
    {
        // Get delta time
        const time_now = Date.now();
        const time_prev = this.time;
        const dt = time_now - time_prev;
        this.accumulated_dt += dt;
        this.time = time_now;

        while (this.accumulated_dt >= this.fixed_dt)
        {
            this.accumulated_dt -= this.fixed_dt;

            // Transform the state
            this.state = this.transform.apply(this.state);
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
        /*const max_vel = .01;
        const vang = Math.random() * 2 * Math.PI;
        const vmag = Math.random() * max_vel;
        const vx = Math.cos(vang) * vmag;
        const vy = Math.sin(vang) * vmag;*/
        const vx = .01;
        const vy = 0;

        // Set up particle property arrays
        this.radii.push(r);
        this.state.push(x);
        this.state.push(y);
        this.state.push(vx);
        this.state.push(vy);
        this.masses.push(m);

        // Update the transform
        const index = this.transform_inv.add(4);
        //this.transform_inv.set_range(index, index, [
        //    [1, 0, this.fixed_dt, 0],
        //    [0, 1, 0, this.fixed_dt],
        //    [0, 0, 1, 0],
        //    [0, 0, 0, 1] ]);
        this.transform_inv.set_range(index, index, [
            [1, 0, -this.fixed_dt, 0],
            [0, 1, 0, -this.fixed_dt],
            [0, 0, 1, 0],
            [0, 0, 0, 1] ]);
        this.transform.populate_from_inverse(this.transform_inv);

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
