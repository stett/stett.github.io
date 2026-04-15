const canvas = document.querySelector('canvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false, antialias: true });

const ext = gl.getExtension("OES_texture_float");

// constants
const dt_fixed = .075;
var r_min = 1; // distance before which particles only repel
var r_max = 2; // max interaction distance
var collision_damping = .2;
var point_size = 1.5;
const bounds = [-20,-20,-20, 20,20,20];

// mutable simulation state
var shape = [80, 80];
var count = shape[0] * shape[1];

// camera orbit
var orbit_radius = 30;
var orbit_azimuth_target = 0;
var orbit_elevation_target = 0;
var orbit_azimuth = 0;
var orbit_elevation = 0;
var camera_pos = [orbit_radius, 0, 0];
var dragging = false;
var drag_prev_x = 0;
var drag_prev_y = 0;
canvas.addEventListener('mousedown', function(e) { dragging = true; drag_prev_x = e.clientX; drag_prev_y = e.clientY; });
canvas.addEventListener('mousemove', function(e) {
  if (!dragging) return;
  orbit_azimuth_target += (e.clientX - drag_prev_x) * 0.005;
  orbit_elevation_target += (e.clientY - drag_prev_y) * 0.005;
  orbit_elevation_target = Math.max(-Math.PI * 0.49, Math.min(Math.PI * 0.49, orbit_elevation_target));
  drag_prev_x = e.clientX;
  drag_prev_y = e.clientY;
});
window.addEventListener('mouseup', function() { dragging = false; });

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

// full color palette (20 colors)
var all_colors = [
  [91/255,  192/255, 235/255],
  [253/255, 231/255, 76/255],
  [155/255, 197/255, 61/255],
  [229/255, 89/255,  52/255],
  [250/255, 121/255, 33/255],
  [88/255,  53/255,  94/255],
  [224/255, 54/255,  22/255],
  [255/255, 246/255, 137/255],
  [207/255, 255/255, 176/255],
  [89/255,  152/255, 197/255],
  [255/255, 105/255, 180/255],
  [64/255,  224/255, 208/255],
  [218/255, 112/255, 214/255],
  [144/255, 238/255, 144/255],
  [255/255, 200/255, 87/255],
  [70/255,  130/255, 180/255],
  [255/255, 99/255,  71/255],
  [127/255, 255/255, 0/255],
  [199/255, 21/255,  133/255],
  [0/255,   206/255, 209/255],
];

// static shader sources (these don't embed shape)
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

    if      (pos.x < bounds_min.x) { pos.x = bounds_min.x; }
    else if (pos.x > bounds_max.x) { pos.x = bounds_max.x; }
    if      (pos.y < bounds_min.y) { pos.y = bounds_min.y; }
    else if (pos.y > bounds_max.y) { pos.y = bounds_max.y; }
    if      (pos.z < bounds_min.z) { pos.z = bounds_min.z; }
    else if (pos.z > bounds_max.z) { pos.z = bounds_max.z; }

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
    gl_Position = proj * view * vec4(pos, 1);
    gl_PointSize = point_size;
  }
`;

const drawFrag = `
  precision mediump float;
  varying vec3 col;
  void main() {
    gl_FragColor = vec4(col, 1.);
  }
`;

// mutable program + location state
var program_accelerate, program_integrate, program_draw;
var accelerate_verts_loc, accelerate_uvs_loc;
var accelerate_pos_loc, accelerate_vel_loc, accelerate_col_loc, accelerate_interaction_loc;
var accelerate_dt_loc, accelerate_r_min_loc, accelerate_r_max_loc;
var accelerate_bounds_min_loc, accelerate_bounds_max_loc, accelerate_collision_damping_loc;
var integrate_verts_loc, integrate_uvs_loc;
var integrate_pos_loc, integrate_vel_loc, integrate_dt_loc;
var integrate_bounds_min_loc, integrate_bounds_max_loc;
var draw_pos_loc, draw_col_loc, draw_view_loc, draw_proj_loc, draw_uv_loc, draw_point_size_loc;

// mutable texture/fbo/buffer state
var pos_tex, vel_tex, pos_fbo, vel_fbo;
var col_tex, col_fbo;
var interaction_tex, interaction_fbo;
var uv_buf;

var swap_index0 = 0;
var swap_index1 = 1;
var time = document.timeline.currentTime;
var clear_buffer = true;
var bg_color = [.1, .1, .1];

// deterministic hash from integer seed
function seedToHash(seed) {
  var h = seed | 0;
  var hex = '0x';
  for (var i = 0; i < 64; i++) {
    h = ((h * 1103515245 + 12345) & 0x7fffffff);
    hex += ((h >> 16) & 0xf).toString(16);
  }
  return hex;
}

function init(seed, numColors, shapeSize) {
  // cleanup old GL resources
  if (program_accelerate) gl.deleteProgram(program_accelerate);
  if (program_integrate) gl.deleteProgram(program_integrate);
  if (program_draw) gl.deleteProgram(program_draw);
  if (pos_tex) { gl.deleteTexture(pos_tex[0]); gl.deleteTexture(pos_tex[1]); }
  if (vel_tex) { gl.deleteTexture(vel_tex[0]); gl.deleteTexture(vel_tex[1]); }
  if (pos_fbo) { gl.deleteFramebuffer(pos_fbo[0]); gl.deleteFramebuffer(pos_fbo[1]); }
  if (vel_fbo) { gl.deleteFramebuffer(vel_fbo[0]); gl.deleteFramebuffer(vel_fbo[1]); }
  if (col_tex) gl.deleteTexture(col_tex);
  if (col_fbo) gl.deleteFramebuffer(col_fbo);
  if (interaction_tex) gl.deleteTexture(interaction_tex);
  if (interaction_fbo) gl.deleteFramebuffer(interaction_fbo);
  if (uv_buf) gl.deleteBuffer(uv_buf);

  // update shape and count
  shape = [shapeSize, shapeSize];
  count = shape[0] * shape[1];

  // seed random
  tokenData.hash = seedToHash(seed);
  var random = new Random();

  // select colors
  var colors = all_colors.slice(0, numColors);

  // initialize particle interaction matrix
  var interactions = new Float32Array(colors.length * colors.length);
  for (var i = 0; i < interactions.length; ++i) {
    interactions[i] = random.random_num(-1, 1);
  }

  var interactions_pixels = new Float32Array(4 * colors.length * colors.length);
  for (var i = 0; i < interactions.length; ++i) {
    var val = interactions[i];
    interactions_pixels[(4*i)+0] = val;
    interactions_pixels[(4*i)+1] = val;
    interactions_pixels[(4*i)+2] = val;
    interactions_pixels[(4*i)+3] = val;
  }

  // build acceleration shader (embeds shape)
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

      // bounce against boundary
      if ((pos.x <= bounds_min.x && vel.x < 0.) || (pos.x >= bounds_max.x && vel.x > 0.)) { vel.x *= -collision_damping; }
      if ((pos.y <= bounds_min.y && vel.y < 0.) || (pos.y >= bounds_max.y && vel.y > 0.)) { vel.y *= -collision_damping; }
      if ((pos.z <= bounds_min.z && vel.z < 0.) || (pos.z >= bounds_max.z && vel.z > 0.)) { vel.z *= -collision_damping; }

      gl_FragColor = vec4(vel, 1);
    }
  `;

  // create programs + get uniform locations
  program_accelerate = createProgram(gl, quad_vs, logicFragAccelerate);
  accelerate_verts_loc = gl.getAttribLocation(program_accelerate, "verts");
  accelerate_uvs_loc = gl.getAttribLocation(program_accelerate, "uvs");
  accelerate_pos_loc = gl.getUniformLocation(program_accelerate, "pos_data");
  accelerate_vel_loc = gl.getUniformLocation(program_accelerate, "vel_data");
  accelerate_col_loc = gl.getUniformLocation(program_accelerate, "col_data");
  accelerate_interaction_loc = gl.getUniformLocation(program_accelerate, "interaction_data");
  accelerate_dt_loc = gl.getUniformLocation(program_accelerate, "dt");
  accelerate_r_min_loc = gl.getUniformLocation(program_accelerate, "r_min");
  accelerate_r_max_loc = gl.getUniformLocation(program_accelerate, "r_max");
  accelerate_bounds_min_loc = gl.getUniformLocation(program_accelerate, "bounds_min");
  accelerate_bounds_max_loc = gl.getUniformLocation(program_accelerate, "bounds_max");
  accelerate_collision_damping_loc = gl.getUniformLocation(program_accelerate, "collision_damping");

  program_integrate = createProgram(gl, quad_vs, logicFragIntegrate);
  integrate_verts_loc = gl.getAttribLocation(program_integrate, "verts");
  integrate_uvs_loc = gl.getAttribLocation(program_integrate, "uvs");
  integrate_pos_loc = gl.getUniformLocation(program_integrate, "pos_data");
  integrate_vel_loc = gl.getUniformLocation(program_integrate, "vel_data");
  integrate_dt_loc = gl.getUniformLocation(program_integrate, "dt");
  integrate_bounds_min_loc = gl.getUniformLocation(program_integrate, "bounds_min");
  integrate_bounds_max_loc = gl.getUniformLocation(program_integrate, "bounds_max");

  program_draw = createProgram(gl, drawVert, drawFrag);
  draw_pos_loc = gl.getUniformLocation(program_draw, "pos_data");
  draw_col_loc = gl.getUniformLocation(program_draw, "col_data");
  draw_view_loc = gl.getUniformLocation(program_draw, "view");
  draw_proj_loc = gl.getUniformLocation(program_draw, "proj");
  draw_uv_loc = gl.getAttribLocation(program_draw, "uv");
  draw_point_size_loc = gl.getUniformLocation(program_draw, "point_size");

  // create particle arrays
  var pos_arr = new Float32Array(4 * count);
  var vel_arr = new Float32Array(4 * count);
  var col_arr = new Float32Array(4 * count);
  for (var i = 0; i < pos_arr.length; ++i) {
    vel_arr[i] = 0;
    var j = i % 4;
    if (j == 3) {
      pos_arr[i] = 0;
      var col = random.random_int(0, colors.length - 1);
      col_arr[i-3] = colors[col][0];
      col_arr[i-2] = colors[col][1];
      col_arr[i-1] = colors[col][2];
      col_arr[i] = col / colors.length;
    } else {
      var size = 1;
      pos_arr[i] = random.random_num(bounds[j] * size, bounds[j+3] * size);
    }
  }

  // create textures + fbos
  pos_tex = [ makeTexture(shape, pos_arr), makeTexture(shape, pos_arr) ];
  vel_tex = [ makeTexture(shape, vel_arr), makeTexture(shape, vel_arr) ];
  pos_fbo = [ makeFBO(pos_tex[0]), makeFBO(pos_tex[1]) ];
  vel_fbo = [ makeFBO(vel_tex[0]), makeFBO(vel_tex[1]) ];
  col_tex = makeTexture(shape, col_arr);
  col_fbo = makeFBO(col_tex);
  interaction_tex = makeTexture([colors.length, colors.length], interactions_pixels);
  interaction_fbo = makeFBO(interaction_tex);

  // create uv buffer
  var uv_arr = new Float32Array(2 * count);
  {
    var i = 0;
    for (var j = 0; j < shape[0]; ++j) {
    for (var k = 0; k < shape[1]; ++k) {
      uv_arr[(2 * i) + 0] = j / shape[0];
      uv_arr[(2 * i) + 1] = k / shape[1];
      i += 1;
    } }
  }
  uv_buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uv_buf);
  gl.bufferData(gl.ARRAY_BUFFER, uv_arr, gl.STATIC_DRAW);
  uv_buf.itemSize = 2;
  uv_buf.numItems = uv_arr.length;

  // reset state
  swap_index0 = 0;
  swap_index1 = 1;
  time = document.timeline.currentTime;
}

function accelerate(dt)
{
  // bind velocity buffer to write to
  gl.bindFramebuffer(gl.FRAMEBUFFER, vel_fbo[swap_index1]);

  // use acceleration pipeline
  gl.useProgram(program_accelerate);

  // set uniforms
  gl.uniform1f(accelerate_dt_loc, dt);
  gl.uniform1f(accelerate_r_min_loc, r_min);
  gl.uniform1f(accelerate_r_max_loc, r_max);
  gl.uniform3f(accelerate_bounds_min_loc, bounds[0], bounds[1], bounds[2]);
  gl.uniform3f(accelerate_bounds_max_loc, bounds[3], bounds[4], bounds[5]);
  gl.uniform1f(accelerate_collision_damping_loc, collision_damping);

  // send the position buffer
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, pos_tex[swap_index0]);
  gl.uniform1i(accelerate_pos_loc, 0);

  // send the velocity buffer
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, vel_tex[swap_index0]);
  gl.uniform1i(accelerate_vel_loc, 1);

  // send the color buffer
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
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, pos_tex[swap_index0]);
  gl.uniform1i(integrate_pos_loc, 0);

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
  // lerp camera towards target
  var lerp_speed = 0.08;
  orbit_azimuth += (orbit_azimuth_target - orbit_azimuth) * lerp_speed;
  orbit_elevation += (orbit_elevation_target - orbit_elevation) * lerp_speed;
  camera_pos[0] = orbit_radius * Math.cos(orbit_elevation) * Math.cos(orbit_azimuth);
  camera_pos[1] = orbit_radius * Math.sin(orbit_elevation);
  camera_pos[2] = orbit_radius * Math.cos(orbit_elevation) * Math.sin(orbit_azimuth);

  // create view and projection matrices
  var fieldOfViewRadians = 1.2;
  var aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  var zNear = 1;
  var zFar = 2000;
  var viewMatrix = m4.inverse(m4.lookAt(camera_pos, [0,0,0], [0,1,0]));
  var projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

  gl.useProgram(program_draw);

  // set uniforms
  gl.uniformMatrix4fv(draw_view_loc, false, viewMatrix);
  gl.uniformMatrix4fv(draw_proj_loc, false, projectionMatrix);
  gl.uniform1f(draw_point_size_loc, point_size);

  // send the position buffers
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, pos_tex[swap_index1]);
  gl.uniform1i(draw_pos_loc, 0);

  // send the color buffer
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

function step(new_time)
{
  // get elapsed time
  var dt = new_time - time;
  time = new_time;

  // clear the screen
  if (clear_buffer) {
    gl.clearColor(bg_color[0], bg_color[1], bg_color[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  } else {
    gl.clear(gl.DEPTH_BUFFER_BIT);
  }

  // update particle positions
  accelerate(dt_fixed);
  integrate(dt_fixed);

  // draw the scene
  draw();

  // swap which buffer we're reading from/writing to
  swap_index0 = (swap_index0 + 1) % 2;
  swap_index1 = (swap_index1 + 1) % 2;

  // next step
  requestAnimationFrame(step);
}

// listen for config changes from parent page
window.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'particle-life-config') {
    if (e.data.clearBuffer !== undefined) clear_buffer = e.data.clearBuffer;
    init(
      e.data.seed !== undefined ? e.data.seed : 87,
      e.data.numColors !== undefined ? e.data.numColors : 15,
      e.data.shapeSize !== undefined ? e.data.shapeSize : 80
    );
  }
  if (e.data && e.data.type === 'particle-life-clear-buffer') {
    clear_buffer = e.data.clearBuffer;
  }
  if (e.data && e.data.type === 'particle-life-bg') {
    bg_color = e.data.bgColor;
  }
});

gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
gl.clearColor(bg_color[0], bg_color[1], bg_color[2], 1);
gl.clear(gl.COLOR_BUFFER_BIT);

var params = new URLSearchParams(window.location.search);
if (params.get('clear') === '0') clear_buffer = false;
init(
  parseInt(params.get('seed')) || 87,
  parseInt(params.get('colors')) || 15,
  parseInt(params.get('shape')) || 80
);
step(document.timeline.currentTime);
