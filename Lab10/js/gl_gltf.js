import { Geometry } from "gl_geometry";
import * as m from 'gl_math';

export async function loadGLTF(path_gltf) {

    let gltf;
    try {
        let response = await fetch(path_gltf);
        gltf = await response.json();
    } catch (error) {
        console.log(`GLTF-loader [error]: ${error}`);
        return null;
    }

    // decode buffers' data URIs
    for (let buffer of gltf.buffers) {
        try {
            let response = await fetch(buffer.uri);
            let blob = await response.blob();
            buffer.data = await blob.arrayBuffer();
        } catch (error) {
            console.log(`GLTF-loader [error]: ${error}`);
            return null;
        }
    }

    return gltf;
}


export async function createGeometryGLTF(gl, gltf, idx_mesh) {
    console.log(`GLTF-to-Geometry [info]: create geometry from mesh ${idx_mesh}`);

    let mesh = gltf.meshes[idx_mesh];
    if (!mesh) {
        return null;
    }

    // restrict to first primitives entry
    //   and get accessor indices (acc_idx)

    let arr = [];

    for (let i = 0; i < mesh.primitives.length; i++){

        let primitives = mesh.primitives[i];
        let acc_idx_position = mesh.primitives[i].attributes["POSITION"];
        let acc_idx_normal = mesh.primitives[i].attributes["NORMAL"];
        let acc_idx_texcoord_0 = mesh.primitives[i].attributes["TEXCOORD_0"];
        let acc_idx_indices = mesh.primitives[i].indices;

        // get accessor for each attribute and indices
        let acc_position = gltf.accessors[acc_idx_position];
        let acc_normal = gltf.accessors[acc_idx_normal];
        let acc_texcoord_0 = gltf.accessors[acc_idx_texcoord_0];
        let acc_indices = gltf.accessors[acc_idx_indices];

        // create corresponding buffer views
        let view_position = gltf.bufferViews[acc_position.bufferView];
        let view_normal = gltf.bufferViews[acc_normal.bufferView];
        let view_texcoord_0 = gltf.bufferViews[acc_texcoord_0.bufferView];
        let view_indices = gltf.bufferViews[acc_indices.bufferView];

        // do some checks
        let types_correct = acc_position.componentType == gl.FLOAT  // Float32Array
            && acc_normal.componentType == gl.FLOAT  // Float32Array
            && acc_texcoord_0.componentType == gl.FLOAT  // Float32Array
            && acc_indices.componentType == gl.UNSIGNED_SHORT;  // Uint16Array
        if (!types_correct) {
            console.log(`GLTF-to-Geometry [error]: Unexpected buffer types!`);
        }

        let same_buffer = view_position.buffer == 0
            && view_normal.buffer == 0
            && view_texcoord_0.buffer == 0
            && view_indices.buffer == 0;
        if (!same_buffer) {
            console.log(`GLTF-to-Geometry [error]: More than one underlying buffer!`);
        }

        // assume it is always the one ArrayBuffer
        let buffer = gltf.buffers[0].data;

        // use accessors and buffer views to create typed arrays

        
        let positions = new Float32Array(buffer, view_position.byteOffset, view_position.byteLength / 4);
        let normals = new Float32Array(buffer, view_normal.byteOffset, view_normal.byteLength / 4);
        let texcoords_0 = new Float32Array(buffer, view_texcoord_0.byteOffset, view_texcoord_0.byteLength / 4);
        let indices = new Uint16Array(buffer, view_indices.byteOffset, view_indices.byteLength / 2);
        let num_indices = acc_indices.count;

        let geometry = new Geometry(gl.TRIANGLES);
        geometry.addArray("a_Position", positions);
        geometry.addArray("a_Normal", normals);
        geometry.addArray("a_TexCoord", texcoords_0);

        geometry.setElements(indices, gl.UNSIGNED_SHORT, num_indices);
        arr.push(geometry);
    }
    return arr;
}

export function loadNodes(gltf, meshIndex){
    const node = gltf.nodes[meshIndex];

    let mat4 = m.mat4_new_identity();

    
    if(node.rotation) {
        const r = node.rotation;
        mat4 = m.mat4_rotate(mat4, r);
    }

    if(node.translation){
        const t = node.translation;
        mat4 = m.mat4_translate(mat4, t[0], t[1], t[2]);
    }

    return mat4;

}

export function loadRotation(gltf, meshIndex){
    const node = gltf.nodes[meshIndex];

    return {
        r: node.rotation,
        t: node.translation
    };

}

export async function loadMaterial(mat, gl){
    let bcf = [1.0,1.0,1.0,1.0];
    let rf = 0.0;
    let mf = 1.0;
    let ef=[1.0,1.0,1.0];

    let bct = null;

    const pbr = mat.pbrMetallicRoughness;

    if (pbr){
        if(pbr.baseColorTexture){
            const uri = '/image0.png';
            bct = await getTexture(gl, uri);
        }
        if(pbr.baseColorFactor){
            bcf = pbr.baseColorFactor;
        }
        mf = pbr.metallicFactor !== undefined ? pbr.metallicFactor : 1.0;
        rf = pbr.roughnessFactor !== undefined ? pbr.roughnessFactor : 1.0;
    }

    if(mat.emissiveFactor){
        ef = mat.emissiveFactor;
    }

    return {bcf,rf,mf,ef,bct};
    
}

async function getTexture(gl, uri) {
    return new Promise(resolve => {
        const img = new Image();
        img.onload=()=>{
            const t = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, t);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
            resolve(t);
        }
        img.src=uri;
        img.crossOrigin='undefined';
    })
}