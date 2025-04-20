const canvas = document.querySelector('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: true });

const ext = gl.getExtension("OES_texture_float");

let random = new Random();

// constants
const G = 1;
const m = 1;
const dt_fixed = .025;
//const dt_fixed = .05;
//const dt_fixed = .075;
//const dt_fixed = 0.1;
//const dt_fixed = random.random_num(0.1, 0.01);//.025;
var r_min = 1; // distance before which particles only repel
var r_max = 2; // max interaction distance

// shape of the fbo for particles
//const shape = [4, 4];
//const shape = [8, 8];
//const shape = [16, 16];
//const shape = [32, 32];
//const shape = [64, 64];
const shape = [128, 128];
//const shape = [256, 128];
//const shape = [256, 256];
//const shape = [512, 512];
//const shape = [1024, 1024];
//const shape = [2048, 2048];
//const shape = [4096, 4096];
const count = shape[0] * shape[1];
var collision_damping = .2;
var point_size = 1;

// min and max of the sph boundary box...
const bounds = [-20,-20,-20, 20,20,20];

// minified helpers:
function createProgram(e,r,a){var o=e.createShader(e.VERTEX_SHADER);if(e.shaderSource(o,r),e.compileShader(o),!e.getShaderParameter(o,e.COMPILE_STATUS))return console.log(e.getShaderInfoLog(o)),e.deleteShader(o),null;var t=e.createShader(e.FRAGMENT_SHADER);if(e.shaderSource(t,a),e.compileShader(t),!e.getShaderParameter(t,e.COMPILE_STATUS))return console.log(e.getShaderInfoLog(t)),e.deleteShader(t),null;var S=e.createProgram();return e.attachShader(S,o),e.attachShader(S,t),e.linkProgram(S),e.getProgramParameter(S,e.LINK_STATUS)?S:(console.log(e.getProgramInfoLog(S)),e.deleteProgram(S),null)}
function subtractVectors($,r){return[$[0]-r[0],$[1]-r[1],$[2]-r[2]]}
function normalize($){var r=Math.sqrt($[0]*$[0]+$[1]*$[1]+$[2]*$[2]);return r>1e-5?[$[0]/r,$[1]/r,$[2]/r]:[0,0,0]}
function cross($,r){return[$[1]*r[2]-$[2]*r[1],$[2]*r[0]-$[0]*r[2],$[0]*r[1]-$[1]*r[0]]}
function dot($,r){return $[0]*r[0]+$[1]*r[1]+$[2]*r[2];}
function length($){return Math.sqrt(dot($,$)); }
function copySign(x,y){return Math.sign(x)===Math.sign(y)?x:-x;}
function perpVector(v){return[copySign(v[2], v[0]), copySign(v[2], v[1]), -copySign(v[0], v[2]) - copySign(v[1], v[2])];}
var m4={
  lookAt:function($,t,n){var r=normalize(subtractVectors($,t)),_=normalize(cross(n,r)),o=normalize(cross(r,_));return[_[0],_[1],_[2],0,o[0],o[1],o[2],0,r[0],r[1],r[2],0,$[0],$[1],$[2],1,]},
  perspective:function($,t,n,r){var _=Math.tan(.5*Math.PI-.5*$),o=1/(n-r);return[_/t,0,0,0,0,_,0,0,0,0,(n+r)*o,-1,0,0,n*r*o*2,0]},
  projection:function($,t,n){return[2/$,0,0,0,0,-2/t,0,0,0,0,2/n,0,-1,1,0,1,]},
  multiply:function($,t){var n=$[0],r=$[1],_=$[2],o=$[3],i=$[4],u=$[5],a=$[6],e=$[7],c=$[8],l=$[9],f=$[10],m=$[11],s=$[12],v=$[13],p=$[14],y=$[15],R=t[0],x=t[1],z=t[2],g=t[3],j=t[4],k=t[5],A=t[6],I=t[7],M=t[8],P=t[9],b=t[10],d=t[11],h=t[12],q=t[13],w=t[14],B=t[15];return[R*n+x*i+z*c+g*s,R*r+x*u+z*l+g*v,R*_+x*a+z*f+g*p,R*o+x*e+z*m+g*y,j*n+k*i+A*c+I*s,j*r+k*u+A*l+I*v,j*_+k*a+A*f+I*p,j*o+k*e+A*m+I*y,M*n+P*i+b*c+d*s,M*r+P*u+b*l+d*v,M*_+P*a+b*f+d*p,M*o+P*e+b*m+d*y,h*n+q*i+w*c+B*s,h*r+q*u+w*l+B*v,h*_+q*a+w*f+B*p,h*o+q*e+w*m+B*y,]},
  translation:function($,t,n){return[1,0,0,0,0,1,0,0,0,0,1,0,$,t,n,1,]},
  xRotation:function($){var t=Math.cos($),n=Math.sin($);return[1,0,0,0,0,t,n,0,0,-n,t,0,0,0,0,1,]},
  yRotation:function($){var t=Math.cos($),n=Math.sin($);return[t,0,-n,0,0,1,0,0,n,0,t,0,0,0,0,1,]},
  zRotation:function($){var t=Math.cos($),n=Math.sin($);return[t,n,0,0,-n,t,0,0,0,0,1,0,0,0,0,1,]},
  scaling:function($,t,n){return[$,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1,]},
  translate:function($,t,n,r){return m4.multiply($,m4.translation(t,n,r))},
  xRotate:function($,t){return m4.multiply($,m4.xRotation(t))},
  yRotate:function($,t){return m4.multiply($,m4.yRotation(t))},
  zRotate:function($,t){return m4.multiply($,m4.zRotation(t))},
  scale:function($,t,n,r){return m4.multiply($,m4.scaling(t,n,r))},
  inverse:function($){var t=$[0],n=$[1],r=$[2],_=$[3],o=$[4],i=$[5],u=$[6],a=$[7],e=$[8],c=$[9],l=$[10],f=$[11],m=$[12],s=$[13],v=$[14],p=$[15],y=l*p,R=v*f,x=u*p,z=v*a,g=u*f,j=l*a,k=r*p,A=v*_,I=r*f,M=l*_,P=r*a,b=u*_,d=e*s,h=m*c,q=o*s,w=m*i,B=o*c,C=e*i,D=t*s,E=m*n,F=t*c,G=e*n,H=t*i,J=o*n,K=y*i+z*c+g*s-(R*i+x*c+j*s),L=R*n+k*c+M*s-(y*n+A*c+I*s),N=x*n+A*i+P*s-(z*n+k*i+b*s),O=j*n+I*i+b*c-(g*n+M*i+P*c),Q=1/(t*K+o*L+e*N+m*O);return[Q*K,Q*L,Q*N,Q*O,Q*(R*o+x*e+j*m-(y*o+z*e+g*m)),Q*(y*t+A*e+I*m-(R*t+k*e+M*m)),Q*(z*t+k*o+b*m-(x*t+A*o+P*m)),Q*(g*t+M*o+P*e-(j*t+I*o+b*e)),Q*(d*a+w*f+B*p-(h*a+q*f+C*p)),Q*(h*_+D*f+G*p-(d*_+E*f+F*p)),Q*(q*_+E*a+H*p-(w*_+D*a+J*p)),Q*(C*_+F*a+J*f-(B*_+G*a+H*f)),Q*(q*l+C*v+h*u-(B*v+d*u+w*l)),Q*(F*v+d*r+E*l-(D*l+G*v+h*r)),Q*(D*u+J*v+w*r-(H*v+q*r+E*u)),Q*(H*l+B*r+G*u-(F*u+J*l+C*r))]},
  vectorMultiply:function($,t){for(var n=[],r=0;r<4;++r){n[r]=0;for(var _=0;_<4;++_)n[r]+=$[_]*t[4*_+r]}return n},
  identity:function(){return[1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];},
};
function makeTexture(shape, pixels) {
  var tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, shape[0], shape[1], 0, gl.RGBA, gl.FLOAT, pixels);
  return tex;
}
function makeFBO(tex) {
  var fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return fbo;
}

// quad buffers
var quad_vertices = [-1,1,0.0, -1,-1,0.0, 1,-1,0.0, 1,1,0.0];
var quad_uvs = [0,1, 0,0, 1,0, 1,1];
var quad_indices = [3,2,1,3,1,0];
var quad_vertex_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad_vertex_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad_vertices), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);
var quad_uv_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quad_uv_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad_uvs), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);
var quad_index_buffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad_index_buffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(quad_indices), gl.STATIC_DRAW);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

// quad shaders
const quad_vs = `
  attribute vec3 verts;
  attribute vec2 uvs;
  varying vec2 uv;
  void main(void) {
    gl_Position = vec4(verts, 1.0);
    uv = uvs;
  }`;
const quad_fs = `
  precision mediump float;
  uniform sampler2D tex;
  uniform float tex_mult;
  uniform vec3 tex_off;
  varying vec2 uv;
  void main(void) {
    vec3 pos = texture2D(tex, uv).xyz;
    gl_FragColor = vec4((tex_off + pos) * tex_mult, 1);
  }`;

var drawQuad;
{
  const quad_shaderProgram = createProgram(gl, quad_vs, quad_fs);
  const quad_verts_loc = gl.getAttribLocation(quad_shaderProgram, "verts");
  const quad_uvs_loc = gl.getAttribLocation(quad_shaderProgram, "uvs");
  const quad_tex_loc = gl.getUniformLocation(quad_shaderProgram, "tex");
  const quad_tex_mult_loc = gl.getUniformLocation(quad_shaderProgram, "tex_mult");
  const quad_tex_off_loc = gl.getUniformLocation(quad_shaderProgram, "tex_off");
  drawQuad = function(tex, tex_off, tex_mult)
  {
    // use the program
    gl.useProgram(quad_shaderProgram);

    // verts
    gl.bindBuffer(gl.ARRAY_BUFFER, quad_vertex_buffer);
    gl.vertexAttribPointer(quad_verts_loc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(quad_verts_loc);

    // uvs
    gl.bindBuffer(gl.ARRAY_BUFFER, quad_uv_buffer);
    gl.vertexAttribPointer(quad_uvs_loc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(quad_uvs_loc);

    // indices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad_index_buffer); 

    // texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(quad_tex_loc, 0);
    gl.uniform1f(quad_tex_mult_loc, tex_mult);
    gl.uniform3f(quad_tex_off_loc, tex_off[0], tex_off[1], tex_off[2]);

    // draw the quad
    gl.clearColor(0, 0, 0, 1);
    //gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0,0,canvas.width,canvas.height);
    gl.drawElements(gl.TRIANGLES, quad_indices.length, gl.UNSIGNED_SHORT,0);
  }
}

// initialize color pallette
var colors = [
  [91/255,  192/255, 235/255],
  [253/255, 231/255, 76/255],
  [155/255, 197/255, 61/255],
  [229/255, 89/255,  52/255],
  [250/255, 121/255, 33/255],

  [88/255, 53/255, 94/255],
  [224/255, 54/255, 22/255],
  [255/255, 246/255, 137/255],
  [207/255, 255/255, 176/255],
  [89/255, 152/255, 197/255]
];

// initialize particle interaction matrix
var interactions = new Float32Array(colors.length * colors.length);
for (let i = 0; i < interactions.length; ++i) {
  const val = random.random_num(-1, 1);
  interactions[i] = val;
}
/*var interactions = [
  1, .5,
  0, 0,
];*/

var interactions_pixels = new Float32Array(4 * colors.length * colors.length);
for (let i = 0; i < interactions.length; ++i) {
  const val = interactions[i];
  interactions_pixels[(4*i)+0] = val;
  interactions_pixels[(4*i)+1] = val;
  interactions_pixels[(4*i)+2] = val;
  interactions_pixels[(4*i)+3] = val;
}

var logicFragAccelerate = `
  precision mediump float;
  uniform sampler2D pos_data;
  uniform sampler2D vel_data;
  uniform sampler2D col_data;
  uniform sampler2D interaction_data;
  uniform float dt;
  uniform vec3 bounds_min;
  uniform vec3 bounds_max;
  uniform float collision_damping;
  uniform float r_min;
  uniform float r_max;
  varying vec2 uv;` +
  "const ivec2 res = ivec2(" + shape[0] + "," + shape[1] + ");" + `

  void main() {
    vec3 pos = texture2D(pos_data, uv).xyz;
    vec3 vel = texture2D(vel_data, uv).xyz;
    vec4 col = texture2D(col_data, uv).rgba;
    float type = col.w;
    vec3 acc = vec3(0);
    for (int i = 0; i < res.x; ++i)
    {
      for (int j = 0; j < res.y; ++j)
      {
        vec2 uv2 = vec2(float(i)/float(res.x), float(j)/float(res.y));
        if (uv2 != uv)
        {
          vec3 pos2 = texture2D(pos_data, uv2).xyz;
          vec4 col2 = texture2D(col_data, uv2).rgba;

          // look up interaction strength from the interaction matrix
          float type2 = col2.w;
          vec2 type_uv = vec2(type, type2);
          //vec2 type_uv = vec2(0,0);
          float interaction = texture2D(interaction_data, type_uv).x;

          // accelerate based on interaction type
          vec3 diff = pos2 - pos;
          float range = r_min;
          float dist = length(diff);
          if (dist > .0001)
          {
            vec3 dir = diff / dist;

            if (dist < range)
            {
              acc += dir * mix(-1., 0., dist / range);
              continue;
            }

            dist -= range;
            range = (r_max - r_min) * .5;
            if (dist < range)
            {
              acc += dir * mix(0., interaction, dist / range);
              continue;
            }

            dist -= range;
            range = (r_max - r_min) * .5;
            if (dist < range)
            {
              acc += dir * mix(interaction, 0., dist / range);
            }
          }
        }
      }
    }

    // accelerate
    vel += acc * dt;

    // damp
    vel *= .9;
    //vel *= .8;
    //vel *= .7;

    // bounce against boundary
    if ((pos.x <= bounds_min.x && vel.x < 0.) || (pos.x >= bounds_max.x && vel.x > 0.)) { vel.x *= -collision_damping; }
    if ((pos.y <= bounds_min.y && vel.y < 0.) || (pos.y >= bounds_max.y && vel.y > 0.)) { vel.y *= -collision_damping; }
    if ((pos.z <= bounds_min.z && vel.z < 0.) || (pos.z >= bounds_max.z && vel.z > 0.)) { vel.x *= -collision_damping; }

    gl_FragColor = vec4(vel, 1);
  }
`;

var logicFragIntegrate = `
  precision mediump float;
  uniform sampler2D pos_data;
  uniform sampler2D vel_data;
  uniform float dt;
  uniform vec3 bounds_min;
  uniform vec3 bounds_max;
  varying vec2 uv;
  void main() {
    vec3 pos = texture2D(pos_data, uv).xyz;
    vec3 vel = texture2D(vel_data, uv).xyz;
    pos += vel * dt;

    //pos.x = 0.;

    if      (pos.x < bounds_min.x) { pos.x = bounds_min.x; }
    else if (pos.x > bounds_max.x) { pos.x = bounds_max.x; }
    if      (pos.y < bounds_min.y) { pos.y = bounds_min.y; }
    else if (pos.y > bounds_max.y) { pos.y = bounds_max.y; }
    if      (pos.z < bounds_min.z) { pos.z = bounds_min.z; }
    else if (pos.z > bounds_max.z) { pos.z = bounds_max.z; }

    vec3 extent = bounds_max - bounds_min;
    vec3 center = bounds_min + (.5 * extent);
    float inner_size = .5;
    vec3 inner_min = center - (inner_size * .5 * extent);
    vec3 inner_max = center + (inner_size * .5 * extent);

    if      (pos.x > inner_min.x && pos.x < center.x) { pos.x = inner_min.x; }
    else if (pos.x < inner_max.x && pos.x > center.x) { pos.x = inner_max.x; }
    if      (pos.y > inner_min.y && pos.y < center.y) { pos.y = inner_min.y; }
    else if (pos.y < inner_max.y && pos.y > center.y) { pos.y = inner_max.y; }
    if      (pos.z > inner_min.z && pos.z < center.z) { pos.z = inner_min.z; }
    else if (pos.z < inner_max.z && pos.z > center.z) { pos.z = inner_max.z; }

    /*
    float dx = (pos.x - inner_min.x) / (inner_size * extent.x);
    float dy = (pos.y - inner_min.y) / (inner_size * extent.y);
    float dz = (pos.z - inner_min.z) / (inner_size * extent.z);
    if (dx > 0. && dy > 0. && dz > 0. && dx < 1. && dy < 1. && dz < 1.)
    {
      int imin = 0;
      int imax = 0;
      float dmin = dx;
      float dmax = dx;
      if (dy < dmin) { imin = 1; dmin = dy; }
      if (dz < dmin) { imin = 2; dmin = dz; }
      if (dy > dmax) { imax = 1; dmax = dy; }
      if (dz > dmax) { imax = 2; dmax = dz; }
      if (dmin < (1. - dmax))
      {
        if      (imin == 0) { pos.x = inner_min.x; }
        else if (imin == 1) { pos.y = inner_min.y; }
        else if (imin == 2) { pos.z = inner_min.z; }
      }
      else
      {
        if      (imax == 0) { pos.x = inner_max.x; }
        else if (imax == 1) { pos.y = inner_max.y; }
        else if (imax == 2) { pos.z = inner_max.z; }
      }
    }
    */

    gl_FragColor = vec4(pos, 1);
  }
`;

const drawVert = `
  precision mediump float;

  uniform sampler2D pos_data0;
  uniform sampler2D pos_data1;
  uniform sampler2D col_data;
  uniform mat4 view;
  uniform mat4 proj;
  uniform float point_size;
  attribute vec2 uv;
  varying vec3 col;
  void main() {
    vec3 pos = texture2D(pos_data0, uv).xyz;

    col = texture2D(col_data, uv).xyz;

    //col = vec3(pos.x, pos.x, pos.x);

    gl_Position = proj * view * vec4(pos, 1);
    gl_PointSize = point_size;

    //float depth = 1./gl_Position.w;
    //float depth = (pos.x + 20.) / 40.;
    //float depth = (pos.x + 20.) / 40.;
    //col = texture2D(col_data, uv).xyz * (1.-depth);
  }
`;

const drawFrag = `
  precision mediump float;
  varying vec3 col;
  void main() {
    // convert velocity to a color
    //float max_spd = 15.;
    //float a0 = min(1., length(vel) / max_spd);
    //float a1 = min(1., a0 * 1.5);
    //float a2 = min(1., a1 * 1.5);
    //vec3 color = vec3(mix(0., 1., a0), mix(.1, .7, a1), mix(.7, .3, a2));

    gl_FragColor = vec4(col, 1.);
  }
`;

// create program for accelerating particles & get it's uniform locations
var program_accelerate = createProgram(gl, quad_vs, logicFragAccelerate);
const accelerate_verts_loc = gl.getAttribLocation(program_accelerate, "verts");
const accelerate_uvs_loc = gl.getAttribLocation(program_accelerate, "uvs");
const accelerate_pos_loc = gl.getUniformLocation(program_accelerate, "pos_data");
const accelerate_vel_loc = gl.getUniformLocation(program_accelerate, "vel_data");
const accelerate_col_loc = gl.getUniformLocation(program_accelerate, "col_data");
const accelerate_interaction_loc = gl.getUniformLocation(program_accelerate, "interaction_data");
//const accelerate_res_loc = gl.getUniformLocation(program_accelerate, "res");
const accelerate_dt_loc = gl.getUniformLocation(program_accelerate, "dt");
const accelerate_G_loc = gl.getUniformLocation(program_accelerate, "G");
const accelerate_m_loc = gl.getUniformLocation(program_accelerate, "m");
const accelerate_r_min_loc = gl.getUniformLocation(program_accelerate, "r_min");
const accelerate_r_max_loc = gl.getUniformLocation(program_accelerate, "r_max");
//const accelerate_smooth_radius_loc = gl.getUniformLocation(program_accelerate, "smooth_radius");
const accelerate_bounds_min_loc = gl.getUniformLocation(program_accelerate, "bounds_min");
const accelerate_bounds_max_loc = gl.getUniformLocation(program_accelerate, "bounds_max");
const accelerate_collision_damping_loc = gl.getUniformLocation(program_accelerate, "collision_damping");

// create program for integrating particles & get it's uniform locations
var program_integrate = createProgram(gl, quad_vs, logicFragIntegrate);
const integrate_verts_loc = gl.getAttribLocation(program_integrate, "verts");
const integrate_uvs_loc = gl.getAttribLocation(program_integrate, "uvs");
const integrate_pos_loc = gl.getUniformLocation(program_integrate, "pos_data");
const integrate_vel_loc = gl.getUniformLocation(program_integrate, "vel_data");
const integrate_dt_loc = gl.getUniformLocation(program_integrate, "dt");
const integrate_bounds_min_loc = gl.getUniformLocation(program_integrate, "bounds_min");
const integrate_bounds_max_loc = gl.getUniformLocation(program_integrate, "bounds_max");

// create a program for drawing the particles & get it's uniform locations
var program_draw = createProgram(gl, drawVert, drawFrag);
const draw_pos_loc = gl.getUniformLocation(program_draw, "pos_data");
const draw_col_loc = gl.getUniformLocation(program_draw, "col_data");
const draw_view_loc = gl.getUniformLocation(program_draw, "view");
const draw_proj_loc = gl.getUniformLocation(program_draw, "proj");
const draw_uv_loc = gl.getAttribLocation(program_draw, "uv");
const draw_point_size_loc = gl.getUniformLocation(program_draw, "point_size");

// create arrays of positions and velocities
var pos_arr = new Float32Array(4 * count);
var vel_arr = new Float32Array(4 * count);
var col_arr = new Float32Array(4 * count);
for (var i = 0; i < pos_arr.length; ++i) {
  vel_arr[i] = 0;
  const j = i % 4;
  if (j == 3) {
    pos_arr[i] = 0;

    // fill in color data
    let col = random.random_int(0, colors.length - 1);
    col_arr[i-3] = colors[col][0];
    col_arr[i-2] = colors[col][1];
    col_arr[i-1] = colors[col][2];
    col_arr[i] = col / colors.length; // normalize so we can use it as a UV in the shaders

  } else {
    //let size = .25;
    let size = 1;
    pos_arr[i] = random.random_num(bounds[j] * size, bounds[j+3] * size);
  }
}
/*
col_arr[0] = colors[0][0];
col_arr[1] = colors[0][1];
col_arr[2] = colors[0][2];
col_arr[3] = 0;
*/

// create fbos with textures for velocity and position on previous and next frames
var pos_tex = [ makeTexture(shape, pos_arr), makeTexture(shape, pos_arr) ];
var vel_tex = [ makeTexture(shape, vel_arr), makeTexture(shape, vel_arr) ];
//var col_tex = [ makeTexture(shape, col_arr), makeTexture(shape, col_arr) ];
var pos_fbo = [ makeFBO(pos_tex[0]), makeFBO(pos_tex[1]) ];
var vel_fbo = [ makeFBO(vel_tex[0]), makeFBO(vel_tex[1]) ];
//var col_fbo = [ makeFBO(col_tex[0]), makeFBO(col_tex[1]) ];
var col_tex = makeTexture(shape, col_arr);
var col_fbo = makeFBO(col_tex);
var interaction_tex = makeTexture([colors.length, colors.length], interactions_pixels);
var interaction_fbo = makeFBO(interaction_tex);

// create a gpu buffer for texture UVs and populate it with uvs. We only need to do it once.
var uv_arr = new Float32Array(2 * count);
{
  var i = 0;
  for (var j = 0; j < shape[0]; ++j) {
  for (var k = 0; k < shape[1]; ++k) {
    uv_arr[(2 * i) + 0] = j / shape[0];
    uv_arr[(2 * i) + 1] = k / shape[1];
    i += 2;
  } }
}
var uv_buf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, uv_buf);
gl.bufferData(gl.ARRAY_BUFFER, uv_arr, gl.STATIC_DRAW);
uv_buf.itemSize = 2;
uv_buf.numItems = uv_arr.length;

// current time - this variable will be updated every frame
var time = document.timeline.currentTime;

// index swaps
var swap_index0 = 0;
var swap_index1 = 1;

function accelerate(dt)
{
  // bind velocity buffer to write to
  gl.bindFramebuffer(gl.FRAMEBUFFER, vel_fbo[swap_index1]);

  // use acceleration pipeline
  gl.useProgram(program_accelerate);

  // set uniforms
  gl.uniform1f(accelerate_dt_loc, dt);
  //gl.uniform1f(accelerate_G_loc, G);
  //gl.uniform1f(accelerate_m_loc, m);
  //gl.uniform2i(accelerate_res_loc, shape[0], shape[1]);
  gl.uniform1f(accelerate_r_min_loc, r_min);
  gl.uniform1f(accelerate_r_max_loc, r_max);
  gl.uniform3f(accelerate_bounds_min_loc, bounds[0], bounds[1], bounds[2]);
  gl.uniform3f(accelerate_bounds_max_loc, bounds[3], bounds[4], bounds[5]);
  gl.uniform1f(accelerate_collision_damping_loc, collision_damping);
  //gl.uniform1f(accelerate_smooth_radius_loc, smooth_radius);

  // send the position buffer
  gl.activeTexture(gl.TEXTURE0); // Tell WebGL we want to affect texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, pos_tex[swap_index0]);// Bind the texture to texture unit 0
  gl.uniform1i(accelerate_pos_loc, 0); // Tell the shader we bound the texture to texture unit 0

  // send the velocity buffer
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, vel_tex[swap_index0]);
  gl.uniform1i(accelerate_vel_loc, 1);

  // send the velocity buffer
  gl.activeTexture(gl.TEXTURE2);
  gl.bindTexture(gl.TEXTURE_2D, col_tex);
  gl.uniform1i(accelerate_col_loc, 2);

  // send the interaction buffer
  gl.activeTexture(gl.TEXTURE3);
  gl.bindTexture(gl.TEXTURE_2D, interaction_tex);
  gl.uniform1i(accelerate_interaction_loc, 3);

  // quad verts
  gl.bindBuffer(gl.ARRAY_BUFFER, quad_vertex_buffer);
  gl.vertexAttribPointer(accelerate_verts_loc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(accelerate_verts_loc);

  // quad uvs
  gl.bindBuffer(gl.ARRAY_BUFFER, quad_uv_buffer);
  gl.vertexAttribPointer(accelerate_uvs_loc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(accelerate_uvs_loc);

  // indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad_index_buffer); 

  // clear the buffer and set the viewport
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0,0,shape[0],shape[1]);

  // draw the quad
  gl.disable(gl.DEPTH_TEST);
  gl.drawElements(gl.TRIANGLES, quad_indices.length, gl.UNSIGNED_SHORT,0);

  // unbind the special target framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function integrate(dt)
{
  // bind velocity buffer to write to
  gl.bindFramebuffer(gl.FRAMEBUFFER, pos_fbo[swap_index1]);

  // use integration pipeline
  gl.useProgram(program_integrate);

  // set uniforms
  gl.uniform1f(integrate_dt_loc, dt);
  gl.uniform3f(integrate_bounds_min_loc, bounds[0], bounds[1], bounds[2]);
  gl.uniform3f(integrate_bounds_max_loc, bounds[3], bounds[4], bounds[5]);

  // send the position buffer
  gl.activeTexture(gl.TEXTURE0); // Tell WebGL we want to affect texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, pos_tex[swap_index0]);// Bind the texture to texture unit 0
  gl.uniform1i(integrate_pos_loc, 0); // Tell the shader we bound the texture to texture unit 0

  // send the velocity buffer
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, vel_tex[swap_index0]);
  gl.uniform1i(integrate_vel_loc, 1);

  // quad verts
  gl.bindBuffer(gl.ARRAY_BUFFER, quad_vertex_buffer);
  gl.vertexAttribPointer(integrate_verts_loc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(integrate_verts_loc);

  // quad uvs
  gl.bindBuffer(gl.ARRAY_BUFFER, quad_uv_buffer);
  gl.vertexAttribPointer(integrate_uvs_loc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(integrate_uvs_loc);

  // indices
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, quad_index_buffer); 

  // clear the buffer and set the viewport
  gl.clearColor(0,0,0,1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.viewport(0,0,shape[0],shape[1]);

  // draw the quad
  gl.disable(gl.DEPTH_TEST);
  gl.drawElements(gl.TRIANGLES, quad_indices.length, gl.UNSIGNED_SHORT,0);

  // unbind the special target framebuffer
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function draw()
{
  // create view and projection matrices
  var cameraAngleRadians = 0;
  //var fieldOfViewRadians = 1.39626;
  var fieldOfViewRadians = 1.2;
  var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  var zNear = 1;
  var zFar = 2000;
  var viewMatrix = m4.inverse(m4.lookAt([-50, 30, 30], [0,0,0], [0,1,0]));
  var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

  gl.useProgram(program_draw);

  // set uniforms
  gl.uniformMatrix4fv(draw_view_loc, false, viewMatrix);
  gl.uniformMatrix4fv(draw_proj_loc, false, projectionMatrix);
  gl.uniform1f(draw_point_size_loc, point_size);

  // send the position buffers
  gl.activeTexture(gl.TEXTURE0); // Tell WebGL we want to affect texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, pos_tex[swap_index1]);// Bind the texture to texture unit 0
  gl.uniform1i(draw_pos_loc, 0); // Tell the shader we bound the texture to texture unit 0

  /*
  gl.activeTexture(gl.TEXTURE1); // Tell WebGL we want to affect texture unit 0
  gl.bindTexture(gl.TEXTURE_2D, pos_tex[swap_index1]);// Bind the texture to texture unit 0
  gl.uniform1i(draw_pos_loc, 1); // Tell the shader we bound the texture to texture unit 0
  */

  /*
  // send the velocity buffer
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, vel_tex[swap_index0]);
  gl.uniform1i(draw_vel_loc, 1);
  */

  // send the velocity buffer
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, col_tex);
  gl.uniform1i(draw_col_loc, 1);

  // bind uv buffer
  gl.enableVertexAttribArray(draw_uv_loc);
  gl.bindBuffer(gl.ARRAY_BUFFER, uv_buf);
  gl.vertexAttribPointer(draw_uv_loc, 2, gl.FLOAT, false, 0, 0);

  // draw the points
  gl.enable(gl.DEPTH_TEST);
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.drawArrays(gl.POINTS, 0, count);
}

//drawQuad(vel_tex[swap_index0], [10,10,10], 1/20);

function step(new_time)
{
  // get elapsed time
  const dt = new_time - time;
  time = new_time;

  // clear the screen
  //gl.clearColor(.1,.1,.1,1);
  //gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  //gl.clear(gl.DEPTH_BUFFER_BIT);

  // update particle positions
  accelerate(dt_fixed);
  integrate(dt_fixed);

  // draw the scene
  draw();
  //drawQuad(pos_tex[swap_index1], [10,10,10], 1/20);
  //drawQuad(vel_tex[swap_index1], [0,0,0], 1);
  //drawQuad(interaction_tex, [1,1,1], .5);

  // swap which buffer we're reading from/writing to
  swap_index0 = (swap_index0 + 1) % 2;
  swap_index1 = (swap_index1 + 1) % 2;

  // next step
  requestAnimationFrame(step);
}

//canvas.style.backgroundColor = "black";
gl.clearColor(.1,.1,.1,1);
gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
//gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
gl.clear(gl.COLOR_BUFFER_BIT);

step(document.timeline.currentTime);
