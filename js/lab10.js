import * as m from "gl_math";
import { default as createIlluminationScene } from "scene_illumination";

let context = { };
let scene = { };

var animationId = 0;
var reset=false;

var vis = {
    grid:true,
    screen:true,
    base:true
}

var grid = {
    r:.3,
    g:.3,
    b:.3
}


window.addEventListener('load', function(){
    const b0 = document.getElementById('a-none');
    const b1 = document.getElementById('a-oc');
    const b2 = document.getElementById('a-d');
    b0.addEventListener('click', function(){
        animationId=0;
    });
    b1.addEventListener('click', function(){
        animationId=1;
    });
    b2.addEventListener('click', function(){
        animationId=2;
    });


    const vg = document.getElementById('v-g');
    const vs = document.getElementById('v-s');
    const vb = document.getElementById('v-b');

    vg.addEventListener('change', function(){
        vis.grid = vg.checked;
    });
    vs.addEventListener('change', function(){
        vis.screen = vs.checked;
    });
    vb.addEventListener('change', function(){
        vis.base=  vb.checked;
    });

    
    const rangeInput = document.querySelector('.js-range-input');
    const output = document.querySelector('.js-range-output');
    const root = document.documentElement;

    function setHue() {
        output.value = rangeInput.value + '°';
        const [r,g,b] = hueToRgb(rangeInput.value);
        root.style.setProperty('--hue', rangeInput.value);
        grid.r=r;
        grid.g=g;
        grid.b=b;
    }

    function setDefaultState() {
        rangeInput.focus();
        setHue();
    }

    rangeInput.addEventListener('input', function(){
        setHue();
    });

    document.addEventListener('DOMContentLoaded', function(){
        setDefaultState();
    });

});

function initRender3D(context) {
    let ctx = context;

    // get HTML canvas element
    let canvas = document.querySelector("#canvas_gl");
    ctx.canvas = canvas;
    ctx.canvas.aspect = canvas.width / canvas.height;

    // get WebGL context
    let gl = canvas.getContext("webgl2");
    ctx.gl = gl;
    if (gl == null) {
      console.error("Can't get WebGL context.");
      return;
    }


    setSize(gl, canvas);
    window.addEventListener('resize', function() {
        setSize(gl, canvas);
    });

    gl.frontFace(gl.CCW);  // standard: GL_CCW
    gl.cullFace(gl.BACK);  // standard: GL_BACK
    gl.enable(gl.CULL_FACE);

    gl.depthFunc(gl.LESS); // standard: GL_LESS
    gl.enable(gl.DEPTH_TEST);
    
    // init viewer position and orientation
    context.viewer_azimuth = Math.PI * 0.25;
    context.viewer_altitude = Math.PI * 0.25;
    context.viewer_distance = 5.0;

    context.viewer_azimuth_down = context.viewer_azimuth;
    context.viewer_altitude_down = context.viewer_altitude;
    context.viewer_distance_down = context.viewer_distance;

    // create view and projection matrices
    context.mat4_V = m.mat4_new_identity();    // model-view matrix
    context.mat4_P = m.mat4_new_identity();     // projection matrix
    context.mat4_PVM = m.mat4_new_identity();   // model-view-projection matrix
    context.mat3_N = m.mat3_new_identity();     // normal matrix: inverse transpose of 3x3 affine part

    context.rot = m.mat4_new_identity();

    context.counter = 0;
    
}

function initScene(context, scene) {
    let ctx = context;
    let gl = context.gl;

    // compile all shaders that are attached to scene
    for (const [name, program] of Object.entries(scene.programs)) {
        program.id = createProgram(gl, 
            program.vertex_shader.source, 
            program.fragment_shader.source);
        if (program.id == null) {
            console.log("[error] compiling program '" + name + "'");
            return false;
        }
        program.is_compiled = true;

        // get active attributes
        let n_attribs = gl.getProgramParameter(program.id, gl.ACTIVE_ATTRIBUTES);
        for (let j=0; j<n_attribs; ++j) {
            let info = gl.getActiveAttrib(program.id, j);
            let loc = gl.getAttribLocation(program.id, info.name);
            program.attributes[info.name] = loc;
        }

        // get active uniforms
        let n_uniforms = gl.getProgramParameter(program.id, gl.ACTIVE_UNIFORMS);
        for (let j=0; j<n_uniforms; ++j) {
            let info = gl.getActiveUniform(program.id, j);
            let loc = gl.getUniformLocation(program.id, info.name);
            program.uniforms[info.name] = loc;
        }
    }

    // create WebGL buffers for all geometries
    const sg = Object.entries(scene.geometries);
    for (const [name, geometry] of sg) {
        geometry.geometries.forEach(g => {
            const buffers = Object.entries(g.buffers);
            for (const [attribute_name, buffer] of buffers) {
                let buffer_gl = gl.createBuffer();
                g.buffers_gl[attribute_name] = buffer_gl;
                gl.bindBuffer(gl.ARRAY_BUFFER, buffer_gl);
                gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
            }
    
            // create index (element) buffer
            if (g.elements) {
                let elements_gl = gl.createBuffer();
                g.elements_gl = elements_gl;
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements_gl);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, g.elements, gl.STATIC_DRAW);
            }
        });
    }

    // attach render functions to shader programs
    scene.programs['simple'].setRenderGeometryFunc(renderGeometrySimpleProgram);
    // scene.programs['phong_flat'].setRenderGeometryFunc(renderGeometryPhongProgram);
    scene.programs['shadow'].setRenderGeometryFunc(renderGeometryShadowProgram);
    scene.programs['texture'].setRenderGeometryFunc(renderGeometryTextureProgram);

    return true;
}


function initShadowMapping(context, scene) {
    let ctx = context;
    let gl = context.gl;
    // const SHADOWMAP_WIDTH = 256;
    // const SHADOWMAP_HEIGHT = 256;

    // init lights
    for (const [name, light] of Object.entries(scene.lights)) {

    }
    
    // create shadow maps
    for (const [name, light] of Object.entries(scene.lights)) {

        if (!light.hasShadowmap())
            continue;

        console.log(`[info] creating shadow map for light '${name}'`);
        
        // create Frame Buffer Object (FBO)
        light.shadowmap.fbo = gl.createFramebuffer();

        // create Texture for FBO color attachment and set parameters
        //   regarding texture format and texture processing
        light.shadowmap.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, light.shadowmap.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA,  light.shadowmap.width, light.shadowmap.height,
            0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // create Render Buffer for FBO depth attachment and set parameters
        light.shadowmap.depthbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, light.shadowmap.depthbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
            light.shadowmap.width, light.shadowmap.height);

        // attach texture and render buffer to FBO
        gl.bindFramebuffer(gl.FRAMEBUFFER, light.shadowmap.fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D, light.shadowmap.texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
            gl.RENDERBUFFER, light.shadowmap.depthbuffer, 0);

        const result = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
        if (result !== gl.FRAMEBUFFER_COMPLETE) {
            console.log(`[error] Problems creating FBO: ${result}`);
        }

        // // attach shadow matrix (identity)
        // light.shadowmap.mat4_vmp = mat4_new();
    }
}


function initMouseHandler(context) {

    context.is_mouse_down = false;
    context.mouse_down = [0.0, 0.0];
    context.mouse_move = [0.0, 0.0];
    context.mouse_wheel = 0.0;

    context.canvas.onmousedown = function(event) {
        let rect = event.target.getBoundingClientRect();

        context.is_mouse_down = true;
        context.mouse_down = transformClient2WebGL(
          [rect.left, rect.top, context.canvas.width, context.canvas.height],
          [event.clientX, event.clientY]
        );
        context.mouse_move = context.mouse_down;

        context.viewer_azimuth_down = context.viewer_azimuth;
        context.viewer_altitude_down = context.viewer_altitude;
        context.viewer_distance_down = context.viewer_distance;
    };

    context.canvas.onmousemove = function(event) {
        let rect = event.target.getBoundingClientRect();

        if (!context.is_mouse_down) {
          return;
        }

        context.mouse_move = transformClient2WebGL(
          [rect.left, rect.top, context.canvas.width, context.canvas.height],
          [event.clientX, event.clientY]
        );
    };

    context.canvas.onmouseup = function(event) {
        context.is_mouse_down = false;
    };

    context.canvas.onmouseout = function(event) {
        context.is_mouse_down = false;
    };

    context.canvas.onwheel = function(event) {
        context.mouse_wheel += event.deltaY;
        event.preventDefault();
    };
}


async function init(context) {
  initRender3D(context);
  scene = await createIlluminationScene(context.gl);
  console.log(scene.geometries.screen);
  initScene(context, scene);
  initShadowMapping(context, scene);
  initMouseHandler(context);
}


function transformClient2WebGL(canvas, mouse) {

    // transform in matrix-vector notation
    // c_wx, c_wy -- canvas width
    // c_x, c_y -- canvas position
    // m_x, m_y -- mouse position
    //
    // ┏ 1  0 ┓   ┏ 2/c_wx       0 ┓ ┏ m_x - c_x ┓   ┏ - 1.0 ┓
    // ┗ 0 -1 ┛ ( ┗      0  2/c_wy ┛ ┗ m_y - c_y ┛ + ┗ - 1.0 ┛ )
    //
    let x_premul =  2.0 / canvas[2];
    let y_premul = -2.0 / canvas[3];
    let x = x_premul*(mouse[0]-canvas[0]) - 1.0;
    let y = y_premul*(mouse[1]-canvas[1]) + 1.0;

    return [x, y];
}


/* 
 * The update() function updates the model
 * that you want to render; it changes the
 * state of the model.
 */
function update(context, timestamp) {
    let ctx = context;    // shortcut alias
    let gl = context.gl;  // shortcut alias

    console.log()

    // lazy initialization
    if (!ctx.timestamp_last) {
        ctx.timestamp_last = timestamp;
        ctx.timestamp_init = timestamp;
        ctx.time = 0.0;
        ctx.angle = 0.0;
        ctx.speed = 20.0; // degree per second
        ctx.speed_zoom = 0.004;
        return;
    }

    // get timestamps and update context
    let ts_init = ctx.timestamp_init;  // initial timestamp in ms
    let ts_last = ctx.timestamp_last   // last timestamp in ms
    let ts_curr = timestamp;           // current timestamp in ms
    ctx.timestamp_last = timestamp;
    ctx.time = (timestamp - ctx.timestamp_init) * 0.001;

    // setup viewer
    context.viewer_distance -= context.speed_zoom * context.mouse_wheel;
    context.mouse_wheel = 0.0;
    context.viewer_distance = 
        Math.max(1.0, Math.min(context.viewer_distance, 10.0)); 
    let dist = context.viewer_distance;
    let altitude = context.viewer_altitude;
    let azimuth = context.viewer_azimuth;
    
    if (context.is_mouse_down) {
      let speed_altitude = 1.0;
      let speed_azimuth = 1.0;
      let dx = context.mouse_move[0] - context.mouse_down[0];
      let dy = context.mouse_move[1] - context.mouse_down[1];
      altitude = context.viewer_altitude_down + speed_altitude * -dy;
      azimuth  = context.viewer_azimuth_down + speed_azimuth * dx;
      altitude = Math.max(-Math.PI*0.45, Math.min(Math.PI*0.45, altitude));
      context.viewer_altitude = altitude;
      context.viewer_azimuth = azimuth;
    }

    let cosAltitude = Math.cos(altitude);
    let sinAltitude = Math.sin(altitude);
    let cosAzimuth = Math.cos(azimuth);
    let sinAzimuth = Math.sin(azimuth);
    
    let eye0_x = cosAltitude * dist;
    let eye1_y = sinAltitude * dist;
    let eye1_x = cosAzimuth * eye0_x;
    let eye1_z = sinAzimuth * eye0_x;
    
    let eye = [eye1_x, eye1_y, eye1_z];
    let center = [0,0,0];
    let up = [0,1,0];

    // update viewer camera
    let aspect = context.canvas.aspect;

    m.mat4_set_lookat(ctx.mat4_V, eye, center, up);
    m.mat4_set_perspective(ctx.mat4_P, 1.5, aspect, 0.1, 100.0);

    // mat4_set_orthogonal(ctx.mat4_P, -10, 10, -10, 10, 100, -100);
    // mat4_set_identity(ctx.mat4_P);

    m.mat4_mul_mat4(ctx.mat4_PVM, ctx.mat4_P, ctx.mat4_V);
    m.mat4_get_topleft_mat3(ctx.mat4_V, ctx.mat3_N); // we just do euclidian


    // update rotating light
    const spot0 = scene.lights.spot0;

    if (spot0.speed === undefined) {
        spot0.speed = 0.1 * (2.0 * Math.PI);                    // set rotation speed [turns / s]
        spot0.vec4_init = m.vec4_new(2.0, 4.0, 0.0, 1.0);       // initial position of light in model space
        spot0.mat4_Rt = m.mat4_new_identity();                  // rotation matrix
        spot0.vec3_position = m.vec3_new(0.0, 0.0, 0.0);        // inhomogeneous position
        spot0.vec3_center = m.vec3_new(0.0, 1.0, 0.0);          // look-at center
        spot0.vec3_up = m.vec3_new(0.0, 1.0, 0.0);              // up vector
    }

    //   spot0 position update (in world frame)
    spot0.angle = ctx.time * spot0.speed;
    m.mat4_set_identity(spot0.mat4_Rt);
    spot0.mat4_Rt[ 0] = Math.cos(spot0.angle); spot0.mat4_Rt[ 2] = Math.sin(spot0.angle);
    spot0.mat4_Rt[ 8] = -spot0.mat4_Rt[ 2];     spot0.mat4_Rt[10] = spot0.mat4_Rt[ 0];
    m.mat4_mul_vec4(spot0.vec4_position, spot0.mat4_Rt, spot0.vec4_init);

    //   spot0 position in camera frame (viewer position frame)
    m.mat4_mul_vec4(spot0.vec4_position_camera, ctx.mat4_V, spot0.vec4_position);

    //   spot0 direction update
    m.vec3_cpy_from_vec4(spot0.vec3_position, spot0.vec4_position);
    m.vec3_sub(spot0.vec3_direction, spot0.vec3_center, spot0.vec3_position);

    // update model-view-projection matrices for light
    //   parameters set_lookat(): eye, center, up
    //   parameters set_perspective(): fov (in radians), aspect, near, far
    m.mat4_set_lookat(spot0.shadowmap.mat4_V, spot0.vec3_position, spot0.vec3_center, spot0.vec3_up);
    m.mat4_set_perspective(spot0.shadowmap.mat4_P, 0.5*Math.PI, 1.0, 0.1, 100.0);
    m.mat4_mul_mat4(spot0.shadowmap.mat4_PVM, spot0.shadowmap.mat4_P, spot0.shadowmap.mat4_V);
}

function hueToRgb(h) {
    // Convert hue to degrees and scale to [0, 6]
    var scaledHue = h / 60;
    // Find the largest integer less than or equal to the scaled hue
    var i = Math.floor(scaledHue);
    // Calculate the fractional part between 0 and 1
    var f = scaledHue - i;
    // Calculate the RGB values based on the hue
    var p = 0;
    var q = 1 - f;
    var t = f;
    if (i % 6 == 0) {
      return [1, t, p];
    } else if (i % 6 == 1) {
      return [q, 1, p];
    } else if (i % 6 == 2) {
      return [p, 1, t];
    } else if (i % 6 == 3) {
      return [p, q, 1];
    } else if (i % 6 == 4) {
      return [t, p, 1];
    } else {
      return [1, p, q];
    }
}
  
function renderGeometrySimpleProgram(gl, program, geometry) {
    if(!vis.grid){
        return;
    }

    let buf_gl = geometry.buffers_gl["a_Position"];
    let buf = geometry.buffers["a_Position"];
    gl.useProgram(program.id);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl);
    gl.vertexAttribPointer(program.attributes.a_Position, 3, gl.FLOAT, false, 0 , 0);
    gl.uniform3f(program.uniforms.u_Color, grid.r,grid.g,grid.b);
    gl.uniformMatrix4fv(program.uniforms.u_PVM, true, context.mat4_PVM);
    gl.drawArrays(geometry.primitives_type, 0, geometry.elements_count);
}


function renderGeometryTextureProgram(gl, program, geometry) {

    let buf_gl_Position = geometry.buffers_gl.a_Position;
    let buf_gl_Normal = geometry.buffers_gl.a_Normal;
    let buf_gl_TexCoord = geometry.buffers_gl.a_TexCoord;
    let buf_gl_elements = geometry.elements_gl;

    gl.useProgram(program.id); // .id contains the WebGL identifier

    // setup attribute pointers (attributes are different for each vertex)
    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl_Position);
    gl.vertexAttribPointer(program.attributes.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl_Normal);
    gl.vertexAttribPointer(program.attributes.a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.a_Normal);

    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl_TexCoord);
    gl.vertexAttribPointer(program.attributes.a_TexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.a_TexCoord);

    // set uniforms (uniforms are same for all vertices)
    gl.uniform1f(program.uniforms.u_Time, context.time);
    gl.uniform1i(program.uniforms.u_Mode, 0);
    gl.uniformMatrix4fv(program.uniforms.u_V, true, context.mat4_V);
    gl.uniformMatrix4fv(program.uniforms.u_P, true, context.mat4_P);
    gl.uniformMatrix4fv(program.uniforms.u_PVM, true, context.mat4_PVM);
    gl.uniformMatrix3fv(program.uniforms.u_N, true, context.mat3_N);

    // light and shadow setting
    const spot0 = scene.lights.spot0;

    gl.activeTexture(gl.TEXTURE0); // active texture unit 0
    gl.bindTexture(gl.TEXTURE_2D, spot0.shadowmap.texture);
    gl.uniform1i(program.uniforms.u_SamplerShadow, 0); // use texture unit 0
    gl.uniform4fv(program.uniforms['u_Lights[0].position'], scene.lights.spot0.vec4_position);

    // bind element buffer and draw elements
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf_gl_elements);
    gl.drawElements(geometry.primitives_type, geometry.elements_count, geometry.elements_type, 0);
}

function renderGeometryShadowProgram(gl, program, geometry) {
    let buf_gl_Position = geometry.buffers_gl.a_Position;
    let buf_gl_Normal = geometry.buffers_gl.a_Normal;
    let buf_gl_elements = geometry.elements_gl;
    let buf_gl_TexCoord = geometry.buffers_gl.a_TexCoord;

    gl.useProgram(program.id); // .id contains the WebGL identifier

    // setup attribute pointers (attributes are different for each vertex)
    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl_Position);
    gl.vertexAttribPointer(program.attributes.a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.a_Position);

    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl_Normal);
    gl.vertexAttribPointer(program.attributes.a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(program.attributes.a_Normal);

    // set uniforms (uniforms are same for all vertices)
    gl.uniform1f(program.uniforms.u_Time, context.time);
    gl.uniform1i(program.uniforms.u_Mode, 0);
    
    const gc = geometry.color;
    let { bcf } = gc;
    if(!bcf){
        bcf=[0.0,0.0,0.0];
    }
    gl.uniform4f(program.uniforms.u_baseColorFactor, bcf[0], bcf[1], bcf[2], 1.0);
    if(gc.bct){

        applyTexture(gl, gc.bct, 1, program.uniforms.u_baseColorTexture, program.uniforms.u_hasBaseColorTexture);
        gl.enableVertexAttribArray(program.attributes.a_TexCoord);
        gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl_TexCoord);
        gl.vertexAttribPointer(program.attributes.a_TexCoord, 2, gl.FLOAT, false, 0, 0);
    }

    //bindBuffer(gl, program.uniforms.u_textCoord, geometry.texCoord);

    gl.uniformMatrix4fv(program.uniforms.u_P, true, context.mat4_P);
    gl.uniformMatrix4fv(program.uniforms.u_PVM, true, context.mat4_PVM);
    gl.uniformMatrix3fv(program.uniforms.u_N, true, context.mat3_N);
    gl.uniformMatrix4fv(program.uniforms.u_V, true, context.mat4_V);

    let g = geometry.transform;
    const n = geometry.name;

    if(!vis[n]){
        return;
    }

    if (n==='screen'){
        const frequency = 5000; // Frequency in Hz
        let val = .5 * Math.sin((Date.now().toFixed(4) / frequency) * 2 * Math.PI)+ 0.5;


        const r = geometry.rotate.r;
        const t = geometry.rotate.t;
        let a = m.mat4_new_identity();

        switch(animationId){
            case 0:
                a = g;
                break;
            case 1:
                a = m.mat4_rotate(a, [r[0], r[1], geometry.rotate.r[2] * val, geometry.rotate.r[3] * val]);
                a = m.mat4_translate(a, t[0], t[1], t[2]);        
                break;
            case 2:
                let mat4 = m.mat4_new_identity();
                m.mat4_set_rot_iden(a, val);
                mat4 = m.mat4_rotate(a, r);
                mat4 = m.mat4_translate(a, t[0], t[1], t[2]);
                break;
        }
        
    
        /*
        m.multiply(a, a, g);
    
        console.log(a);
        console.log(g);
    
        console.log("\n\n------------------------------------------\n\n");*/
        gl.uniformMatrix4fv(program.uniforms.u_M, false, a);
    } else {
        
        gl.uniformMatrix4fv(program.uniforms.u_M, false, g);
    }

    //console.log(n);
    //console.log(geometry.transform);
    //console.log(g);




    // light parameters
    const spot0 = scene.lights.spot0;

    gl.uniform4fv(program.uniforms['u_Lights[0].position'], spot0.vec4_position);
    gl.uniform4fv(program.uniforms['u_Lights[0].position_camera'], spot0.vec4_position_camera);

    // shadow mapping
    
    gl.uniformMatrix4fv(program.uniforms['u_Shadowmaps[0].PVM'], true, spot0.shadowmap.mat4_PVM);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, spot0.shadowmap.texture);
    
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 256, 256,
    //     0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    gl.uniform1i(program.uniforms['u_Shadowmaps[0].Sampler'], 0); // use texture unit 0

    // bind element buffer and draw elements
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buf_gl_elements);
    gl.drawElements(geometry.primitives_type, geometry.elements_count, geometry.elements_type, 0);
}

function applyTexture(gl, tex, target, uf, euf){
    if(tex){
        gl.activeTexture(gl.TEXTURE0 + target);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(uf, target);
    }
    if (euf !== undefined){
        gl.uniform1i(euf, tex ? 1 : 0);
    }
}
/*
function bindBuffer(gl, pos, buff) {
    if(buff === null){
        return;
    }

    gl.enableVertexAttribArray(pos);
    gl.bindBuffer(gl.ARRAY_BUFFER, buff.buffer);
    gl.vertexAttribPointer(pos, buff.size, buff.type, false, 0, 0);
    return buff;
}*/

function render_pass_shadows_geometry(program) {
    let ctx = context;
    let gl = context.gl;
    
    // loop over geometry
    const gs = Object.entries(scene.geometries);
    for (const [name, geometry] of gs) {

        geometry.geometries.forEach(g=>{
            if (!g.hasElements())
                return;
    
            // setup attribute pointers (attributes are different for each vertex)
            gl.bindBuffer(gl.ARRAY_BUFFER, g.buffers_gl.a_Position);
            gl.vertexAttribPointer(program.attributes.a_Position, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(program.attributes.a_Position);
    
            // bind element buffer and draw elements
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, g.elements_gl);
            gl.drawElements(g.primitives_type, g.elements_count, g.elements_type, 0);
        });

        // render only indexed-buffer geometry
    }
}

function render_pass_shadows() {
    let ctx = context;
    let gl = context.gl;

    // create shadow maps with special 'shadowmap_create' shader program
    let program = scene.programs.shadowmap_create;
    for (const [name, light] of Object.entries(scene.lights)) {

        if (!light.hasShadowmap())
            continue;

        // render from light point to FBO
        gl.bindFramebuffer(gl.FRAMEBUFFER, light.shadowmap.fbo);
        gl.viewport(0, 0, light.shadowmap.width, light.shadowmap.height);

        // clear FBO's color and depth attachements
        gl.clearColor(1.0, 1.0, 1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // set up program to create shadow map
        gl.useProgram(program.id);
        gl.uniformMatrix4fv(program.uniforms.u_V, true, light.shadowmap.mat4_V);
        gl.uniformMatrix4fv(program.uniforms.u_PVM, true, light.shadowmap.mat4_PVM);

        // render geometry
        render_pass_shadows_geometry(program);
    }


}


function render_pass_final() {
    let ctx = context;
    let canvas = context.canvas;
    let gl = context.gl;

    // reset framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, .1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const sg = Object.entries(scene.geometries);
    for (const [name, geometry] of sg) {
        geometry.geometries.forEach(g=>{
            if (!g.hasProgram())
                return;
    
            let program = g.getProgram();
            if (program.canRenderGeometry()) {
                program.renderGeometry(gl, g);
                return;
            }
        });
    }
}

/* 
 * The render() function issues the draw calls
 * based on the current state of the model.
 */
function render(context) {
    let ctx = context;
    let gl = context.gl;

    render_pass_shadows(scene);
    render_pass_final(scene);
}

/* 
 * The step() function is called for each animation
 * step. Note that the time points are not necessarily
 * equidistant.
 */
function step(timestamp) {
  update(context, timestamp);
  render(context);
  window.requestAnimationFrame(step);
}


async function main() {
    await init(context);
    window.requestAnimationFrame(step);
}

// make main function available globally
window.main = main;

    
const setSize = (gl, canvas) => {
    const devicePixelRatio = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    gl.viewport(0, 0, canvas.width, canvas.height);
}