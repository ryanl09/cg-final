const SHADER_TYPE = {
    VERTEX : "VERTEX_SHADER",
    FRAGMENT : "FRAGMENT_SHADER"
}

class Shader {
    static get TYPE() { return SHADER_TYPE; }

    constructor(type, source) {
        this.type = type;
        this.source = source;
        this.is_compiled = false;
    }
}

class Program {

    constructor(vertex_shader, fragment_shader) {
        this.vertex_shader = vertex_shader;
        this.fragment_shader = fragment_shader;
        this.is_compiled = false;
        this.attributes = { };
        this.uniforms = { };
        this.funcRenderGeometry = null;
    }

    isCompiled() { return is_compiled; }

    setRenderGeometryFunc(func) { this.funcRenderGeometry = func; }
    canRenderGeometry() { return this.funcRenderGeometry != null; }
    renderGeometry(gl, geometry) { this.funcRenderGeometry(gl, this, geometry); }
}



async function loadShadersProgram(V_SHADER, F_SHADER) {
    let program = new Program(
        new Shader(Shader.TYPE.VERTEX, V_SHADER),
        new Shader(Shader.TYPE.FRAGMENT, F_SHADER),
    );

    return program;
}