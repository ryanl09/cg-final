#version 300 es
/*

  author: Stephan Ohl
  Educational Code

*/

struct Light {
    vec4 position;          // light position in world frame
//    vec4 position_camera;   // light position in camera frame
    vec3 La;
    vec3 Ld;
    vec3 Ls;
};

uniform Light u_Lights[2];

struct Shadowmap {
    mat4 PVM;                           // shadowmap model-view-projection matrix
    sampler2D Sampler;                  // shadowmap sampler
};

uniform Shadowmap u_Shadowmaps[2];

in vec3 a_Position;             // vertex position
in vec3 a_Normal;               // vertex normal
in vec2 a_TexCoord;

uniform mat4 u_V;              // view matrix
uniform mat4 u_P;               // projection matrix
uniform mat4 u_PVM;             // model-view-projection matrix
uniform mat4 u_M;               //model matrix
uniform mat3 u_N;               // normal matrix: inverse transpose of 3x3 affine part
uniform float u_Time;
uniform int u_Mode;

out vec2 v_texCoord;
out vec3 smooth_point_camera;   // surface point in camera coordinates
out vec3 smooth_point_world;    // surface point in world coordinates
out vec3 smooth_normal;         // surface normal in camera coordinates


void main() {

    // transform vertex
    vec4 point_model = vec4(a_Position.xyz, 1.0);               // homogenize point coordinates
    vec4 point_camera = u_V * point_model;                     // vertex in camera frame
    vec4 point_screen = u_PVM * u_M * point_model ;                     // vertex in normalized camera space

    gl_Position = point_screen;

    // lighting calculations
    vec3 normal = normalize(u_N * a_Normal);                    // normal vector transformed by inverse-transpose

    // hand over to fragment shader
    smooth_point_camera = point_camera.xyz;                     // interpolate positions in fragment shader
    smooth_normal = normal;                                     // interpolate normals in fragment shader

    smooth_point_world = a_Position.xyz;
    v_texCoord = fract(a_TexCoord * 1.0 );


}
