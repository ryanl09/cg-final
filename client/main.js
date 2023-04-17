const V_SHADER = `
attribute vec3 a_Position;

uniform mat4 u_PVM;         // model-view-projection matrix
uniform vec3 u_Color;

varying vec4 v_Color;

void main() {
    gl_Position = u_PVM*vec4(a_Position, 1.0);
    v_Color = vec4(u_Color, 1.0);
}

`;

const F_SHADER = `
precision highp float;

varying vec4 v_Color;

void main() {
    gl_FragColor = v_Color;
}
`;




let context = {};
let scene = {};

function render_pass_final(scene) {
    let ctx = context;
    let canvas = context.canvas;
    let gl = context.gl;

    // reset framebuffer
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.95, 0.95, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (const [name, geometry] of Object.entries(scene.geometries)) {

        console.log(geometry);
        if (!geometry.hasProgram())
            continue;

        let program = geometry.getProgram();

        if (program.canRenderGeometry()) {
            // here: pick render function based on shader program
            program.renderGeometry(gl, geometry);
            continue;
        }
    }
}

async function main(){
    await (async function () {
        initRender3D(context);
        scene = await loadScene(context.gl);
        initScene(context, scene);
        initMouseHandler(context);
    })();
    window.requestAnimationFrame(step);
}

function initRender3D(context) {
    let ctx = context;

    // get HTML canvas element
    let canvas = document.getElementById('gl');
    ctx.canvas = canvas;
    ctx.canvas.aspect = canvas.width / canvas.height;

    // get WebGL context
    let gl = canvas.getContext("webgl2");
    ctx.gl = gl;
    if (gl == null) {
      console.error("Can't get WebGL context.");
      return;
    }

    console.log(`[info] ${gl.getParameter(gl.VERSION)}`);
    console.log(`[info] ${gl.getParameter(gl.SHADING_LANGUAGE_VERSION)}`);

    // setup WebGL 
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
    context.mat4_VM = m.mat4_new_identity();    // model-view matrix
    context.mat4_P = m.mat4_new_identity();     // projection matrix
    context.mat4_PVM = m.mat4_new_identity();   // model-view-projection matrix
    context.mat3_N = m.mat3_new_identity();     // normal matrix: inverse transpose of 3x3 affine part
    
}



function step(timestamp) {
  update(context, timestamp);
  render(context);
  window.requestAnimationFrame(step);
}


function render(context) {
    let ctx = context;
    let gl = context.gl;

    //render_pass_shadows(scene);
    render_pass_final(scene);
}
function update(context, timestamp) {
    let ctx = context;
    let gl = context.gl;

    if (!ctx.timestamp_last) {
        ctx.timestamp_last = timestamp;
        ctx.timestamp_init = timestamp;
        ctx.time = 0.0;
        ctx.angle = 0.0;
        ctx.speed = 20.0; // degree per second
        ctx.speed_zoom = 0.004;
        return;
    }

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

    let aspect = context.canvas.aspect;

    m.mat4_set_lookat(ctx.mat4_VM, eye, center, up);
    m.mat4_set_perspective(ctx.mat4_P, 1.5, aspect, 0.1, 100.0);

    m.mat4_mul_mat4(ctx.mat4_PVM, ctx.mat4_P, ctx.mat4_VM);
    m.mat4_get_topleft_mat3(ctx.mat4_VM, ctx.mat3_N); // we just do euclidian


    /*
    const spot0 = scene.lights.spot0;

    if (spot0.speed === undefined) {
        spot0.speed = 0.1 * (2.0 * Math.PI);                    // set rotation speed [turns / s]
        spot0.vec4_init = m.vec4_new(2.0, 4.0, 0.0, 1.0);       // initial position of light in model space
        spot0.mat4_Rt = m.mat4_new_identity();                  // rotation matrix
        spot0.vec3_position = m.vec3_new(0.0, 0.0, 0.0);        // inhomogeneous position
        spot0.vec3_center = m.vec3_new(0.0, 1.0, 0.0);          // look-at center
        spot0.vec3_up = m.vec3_new(0.0, 1.0, 0.0);              // up vector
    }

    spot0.angle = ctx.time * spot0.speed;
    m.mat4_set_identity(spot0.mat4_Rt);
    spot0.mat4_Rt[ 0] = Math.cos(spot0.angle); spot0.mat4_Rt[ 2] = Math.sin(spot0.angle);
    spot0.mat4_Rt[ 8] = -spot0.mat4_Rt[ 2];     spot0.mat4_Rt[10] = spot0.mat4_Rt[ 0];
    m.mat4_mul_vec4(spot0.vec4_position, spot0.mat4_Rt, spot0.vec4_init);

    m.mat4_mul_vec4(spot0.vec4_position_camera, ctx.mat4_VM, spot0.vec4_position);

    m.vec3_cpy_from_vec4(spot0.vec3_position, spot0.vec4_position);
    m.vec3_sub(spot0.vec3_direction, spot0.vec3_center, spot0.vec3_position);*/

    /*
    m.mat4_set_lookat(spot0.shadowmap.mat4_VM, spot0.vec3_position, spot0.vec3_center, spot0.vec3_up);
    m.mat4_set_perspective(spot0.shadowmap.mat4_P, 0.5*Math.PI, 1.0, 0.1, 100.0);
    m.mat4_mul_mat4(spot0.shadowmap.mat4_PVM, spot0.shadowmap.mat4_P, spot0.shadowmap.mat4_VM);*/
}


function transformClient2WebGL(canvas, mouse) {
    let x_premul =  2.0 / canvas[2];
    let y_premul = -2.0 / canvas[3];
    let x = x_premul*(mouse[0]-canvas[0]) - 1.0;
    let y = y_premul*(mouse[1]-canvas[1]) + 1.0;

    return [x, y];
}

async function loadScene(gl){
    const scene = new Scene('main');
    let program_simple = await loadShadersProgram(V_SHADER, F_SHADER);
    scene.programs = {
        simple: program_simple
    };
    let grid = createGeometryGrid(gl);
    let gltf = await loadGLTF("/client/assets/cube.gltf");
    let mesh0 = await createGeometryGLTF(gl, gltf, 0);
    grid.setProgram(program_simple);

    scene.geometries = {
        grid:grid
    };

    return scene;
}



function initScene(context, scene) {
    let ctx = context;
    let gl = context.gl;

    // compile all shaders that are attached to scene
    for (const [name, program] of Object.entries(scene.programs)) {
        console.log("[info] compile program '" + name + "'");
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
            console.log("  found attribute '" + info.name + "'");
            program.attributes[info.name] = loc;
        }

        // get active uniforms
        let n_uniforms = gl.getProgramParameter(program.id, gl.ACTIVE_UNIFORMS);
        for (let j=0; j<n_uniforms; ++j) {
            let info = gl.getActiveUniform(program.id, j);
            let loc = gl.getUniformLocation(program.id, info.name);
            console.log("  found uniform '" + info.name + "'");
            program.uniforms[info.name] = loc;
        }
    }

    // create WebGL buffers for all geometries
    for (const [name, geometry] of Object.entries(scene.geometries)) {
        console.log("[info] creating buffers for geometry '" + name 
            + "' with " + geometry.primitives + " primitives");

        // create attribute buffers
        for (const [attribute_name, buffer] of Object.entries(geometry.buffers)) {
            console.log("  buffer for attribute '" + attribute_name + "'");
            let buffer_gl = gl.createBuffer();
            geometry.buffers_gl[attribute_name] = buffer_gl;
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer_gl);
            gl.bufferData(gl.ARRAY_BUFFER, buffer, gl.STATIC_DRAW);
        }

        // create index (element) buffer
        if (geometry.elements) {
            console.log("  buffer for elements");
            let elements_gl = gl.createBuffer();
            geometry.elements_gl = elements_gl;
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, elements_gl);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geometry.elements, gl.STATIC_DRAW);
        }
    }

    scene.programs['simple'].setRenderGeometryFunc(renderGeometrySimpleProgram);

    return true;
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




function renderGeometrySimpleProgram(gl, program, geometry) {

    let buf_gl = geometry.buffers_gl["a_Position"];
    let buf = geometry.buffers["a_Position"];

    gl.useProgram(program.id);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf_gl);
    gl.vertexAttribPointer(program.attributes.a_Position, 3, gl.FLOAT, false, 0 , 0);
    gl.uniform3f(program.uniforms.u_Color, 0.9, 0.9, 0.9);
    gl.uniformMatrix4fv(program.uniforms.u_PVM, true, context.mat4_PVM);

    gl.drawArrays(geometry.primitives_type, 0, geometry.elements_count);
}


/**
 * classes
 */


class Scene {
    constructor(name) {
        this.name = name;
    }
}

main();