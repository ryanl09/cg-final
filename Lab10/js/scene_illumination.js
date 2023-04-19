import { SHADER_TYPE, Shader, Program, loadShaderProgram } from "gl_shader";
import { Light, LightType, Shadowmap } from "gl_light"
import { Geometry } from "gl_geometry";
import { createGeometryQuad, createGeometryPlane } from "geometries/basic";
import { createGeometryGrid } from "geometries/grid";
import { loadGLTF, createGeometryGLTF } from "gl_gltf";


class Scene {
    constructor(name) {
        this.name = name;
    }
}


export default async function createIlluminationScene(gl) {


    let scene = new Scene('Illumination');

    let program_simple = await loadShaderProgram(
        "assets/shaders/simple.vert.glsl",
        "assets/shaders/simple.frag.glsl",
    );
    let program_phong_flat = await loadShaderProgram(
        "assets/shaders/phong_flat.vert.glsl",
        "assets/shaders/phong_flat.frag.glsl",
    );
    let program_phong_smooth = await loadShaderProgram(
        "assets/shaders/phong_smooth.vert.glsl",
        "assets/shaders/phong_smooth.frag.glsl",
    );
    let program_shadow = await loadShaderProgram(
        "assets/shaders/shadow.vert.glsl",
        "assets/shaders/shadow.frag.glsl",
    );
    let program_texture = await loadShaderProgram(
        "assets/shaders/texture.vert.glsl",
        "assets/shaders/texture.frag.glsl",
    );
    let program_shadowmap_create = await loadShaderProgram(
        "assets/shaders/shadowmap_create.vert.glsl",
        "assets/shaders/shadowmap_create.frag.glsl",
    );


    // shader programs
    scene.programs = {
        simple: program_simple,
        phong_flat: program_phong_flat,
        phong_smooth: program_phong_smooth,
        shadow: program_shadow,
        texture: program_texture,
        shadowmap_create: program_shadowmap_create,
    };

    // create geometries
    let grid = createGeometryGrid(gl);
    let plane = createGeometryPlane(gl);
    let quad = createGeometryQuad(gl);

    // load geometries
    let gltf = await loadGLTF("assets/objects/laptop.gltf");
    let laptop = await createGeometryGLTF(gl, gltf, 1);
    let laptop2 = await createGeometryGLTF(gl, gltf, 2);
    let laptop3 = await createGeometryGLTF(gl, gltf, 3);
    let laptop4 = await createGeometryGLTF(gl, gltf, 4);

    // set programs
    grid.setProgram(program_simple);
    plane.setProgram(program_shadow);
    laptop.forEach(e => e.setProgram(program_shadow));
    laptop2.forEach(e => e.setProgram(program_shadow));
    laptop3.forEach(e => e.setProgram(program_shadow));
    laptop4.forEach(e => e.setProgram(program_shadow));
    quad.setProgram(program_texture);

    // add objects to scene
    scene.geometries = {
        grid: grid,
        la0: laptop[0],
        la1: laptop[1],
        la2: laptop[2],
        la3: laptop[3],
        lb0: laptop2[0],
        lb1: laptop2[1]
    };

    // create lights
    let spot0 = new Light(LightType.LIGHT_SPOT);
    // spot0.setShadowmap(new Shadowmap(256, 256));
    spot0.setShadowmap(new Shadowmap(1024, 1024));
    //
    // add lights to scene
    scene.lights = {
        spot0: spot0,
    };

    console.log("[info] scene 'Illumination' constructed");



    return scene;
}

