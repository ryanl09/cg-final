import { SHADER_TYPE, Shader, Program, loadShaderProgram } from "gl_shader";
import { Light, LightType, Shadowmap } from "gl_light"
import { Geometry } from "gl_geometry";
import { createGeometryQuad, createGeometryPlane } from "geometries/basic";
import { createGeometryGrid } from "geometries/grid";
import { loadGLTF, createGeometryGLTF, loadNodes, loadMaterial, loadRotation } from "gl_gltf";


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
    let gltf = await loadGLTF("assets/objects/laptopfrog.gltf");
    let laptopBase = await createGeometryGLTF(gl, gltf, 0);
    let baseTransform = loadNodes(gltf, 0);

    let laptopScreen = await createGeometryGLTF(gl, gltf, 1);
    let screenTransform = loadNodes(gltf, 1);

    let screenRotate = loadRotation(gltf, 1);
    
    const mats = gltf.materials;

    const mapped = mats.map(e => e.name);
    const baseIndex = mapped.indexOf("LaptopBody");
    const screenIndex = mapped.indexOf("LaptopScreen");

    let baseColor = await loadMaterial(mats[baseIndex],gl);
    let screenColor = await loadMaterial(mats[screenIndex], gl);

    // set programs
    grid.setProgram(program_simple);
    plane.setProgram(program_shadow);
    laptopBase.forEach(e => {
        e.setProgram(program_shadow)
        e['transform'] = baseTransform;
        e['name'] = 'base';
        e['color'] = baseColor;
    });
    laptopScreen.forEach(e => {
        e.setProgram(program_shadow)
        e['transform'] = screenTransform;
        e['color'] = screenColor;
        e['name'] = 'screen';
        e['rotate'] = screenRotate;
    });
    quad.setProgram(program_texture);


    // add objects to scene
    scene.geometries = {
        grid: {
            name:'grid',
            geometries:[grid],
            transform:{}
        },
        base: {
            name: 'base',
            geometries: laptopBase,
            transform: baseTransform
        },
        screen: {
            name:'screen',
            geometries:laptopScreen,
            transform:screenTransform
        }
    };

    let spot0 = new Light(LightType.LIGHT_SPOT);
    // spot0.setShadowmap(new Shadowmap(256, 256));
    spot0.setShadowmap(new Shadowmap(1024, 1024));
    //
    // add lights to scene
    scene.lights = {
        spot0: spot0,
    };

    return scene;
}

