export default function version() {
    return "0.1.0";
}


export function vec3_new(x, y, z) {
    return new Float32Array([ x, y, z ]);
}

export function vec3_set(vec4, x, y, z) {
    vec4[0] = x;
    vec4[1] = y;
    vec4[2] = z;
}


export function vec3_sub(res3, v3a, v3b) {
    res3[0] = v3a[0] - v3b[0];
    res3[1] = v3a[1] - v3b[1];
    res3[2] = v3a[2] - v3b[2];
}

export function vec3_cpy_from_vec4(vec3, vec4) {
    vec3[0] = vec4[0];
    vec3[1] = vec4[1];
    vec3[2] = vec4[2];
}

export function vec4_new(x, y, z, w) {
    return new Float32Array([ x, y, z, w ]);
}

export function vec4_set(vec4, x, y, z, w) {
    vec4[0] = x;
    vec4[1] = y;
    vec4[2] = z;
    vec4[3] = w;
}

export function mat3_new_identity() {
    return new Float32Array([
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0
    ]);
}


export function mat3_set_identity(mat3) {
    mat3.set([
        1.0, 0.0, 0.0,
        0.0, 1.0, 0.0,
        0.0, 0.0, 1.0
    ]);
}


export function mat4_new_identity(mat3) {
    return new Float32Array([
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    ]);
}


export function mat4_set_identity(mat4) {
    mat4.set([
        1.0, 0.0, 0.0, 0.0,
        0.0, 1.0, 0.0, 0.0,
        0.0, 0.0, 1.0, 0.0,
        0.0, 0.0, 0.0, 1.0
    ]);
}

export function mat4_set_rot_iden(mat4, num){
    mat4.set([
        num, 0.0, 0.0, 0.0,
        0.0, num, 0.0, 0.0,
        0.0, 0.0, num, 0.0,
        0.0, 0.0, 0.0, num
    ]);

}

export function mat4_create() {
    return new Float32Array([
        0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0,
        0.0, 0.0, 0.0, 0.0
    ]);
}

export function mat4_translate(mat4, tx, ty, tz){
    mat4[12] += tx;
    mat4[13] += ty;
    mat4[14] += tz;
    return mat4;
}

function fromQuat(q) {
    const out = mat4_create();
    let x = q[0],
      y = q[1],
      z = q[2],
      w = q[3];
    let x2 = x + x;
    let y2 = y + y;
    let z2 = z + z;
  
    let xx = x * x2;
    let yx = y * x2;
    let yy = y * y2;
    let zx = z * x2;
    let zy = z * y2;
    let zz = z * z2;
    let wx = w * x2;
    let wy = w * y2;
    let wz = w * z2;
  
    out[0] = 1 - yy - zz;
    out[1] = yx + wz;
    out[2] = zx - wy;
    out[3] = 0;
  
    out[4] = yx - wz;
    out[5] = 1 - xx - zz;
    out[6] = zy + wx;
    out[7] = 0;
  
    out[8] = zx + wy;
    out[9] = zy - wx;
    out[10] = 1 - xx - yy;
    out[11] = 0;
  
    out[12] = 0;
    out[13] = 0;
    out[14] = 0;
    out[15] = 1;
  
    return out;
}
export function multiply(out, a, b) {
    let a00 = a[0],
      a01 = a[1],
      a02 = a[2],
      a03 = a[3];
    let a10 = a[4],
      a11 = a[5],
      a12 = a[6],
      a13 = a[7];
    let a20 = a[8],
      a21 = a[9],
      a22 = a[10],
      a23 = a[11];
    let a30 = a[12],
      a31 = a[13],
      a32 = a[14],
      a33 = a[15];
  
    // Cache only the current line of the second matrix
    let b0 = b[0],
      b1 = b[1],
      b2 = b[2],
      b3 = b[3];
    out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  
    b0 = b[4];
    b1 = b[5];
    b2 = b[6];
    b3 = b[7];
    out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  
    b0 = b[8];
    b1 = b[9];
    b2 = b[10];
    b3 = b[11];
    out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
  
    b0 = b[12];
    b1 = b[13];
    b2 = b[14];
    b3 = b[15];
    out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
    out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
    out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
    out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
    return out;
  }

export function mat4_rotate(mat4, r){
    const rotate = fromQuat(r);
    return multiply(mat4, mat4, rotate);
}
export function translate(out, a, v) {
    let x = v[0],
      y = v[1],
      z = v[2];
    let a00, a01, a02, a03;
    let a10, a11, a12, a13;
    let a20, a21, a22, a23;
  
    if (a === out) {
      out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
      out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
      out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
      out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
    } else {
      a00 = a[0];
      a01 = a[1];
      a02 = a[2];
      a03 = a[3];
      a10 = a[4];
      a11 = a[5];
      a12 = a[6];
      a13 = a[7];
      a20 = a[8];
      a21 = a[9];
      a22 = a[10];
      a23 = a[11];
  
      out[0] = a00;
      out[1] = a01;
      out[2] = a02;
      out[3] = a03;
      out[4] = a10;
      out[5] = a11;
      out[6] = a12;
      out[7] = a13;
      out[8] = a20;
      out[9] = a21;
      out[10] = a22;
      out[11] = a23;
  
      out[12] = a00 * x + a10 * y + a20 * z + a[12];
      out[13] = a01 * x + a11 * y + a21 * z + a[13];
      out[14] = a02 * x + a12 * y + a22 * z + a[14];
      out[15] = a03 * x + a13 * y + a23 * z + a[15];
    }
  
    return out;
  }


export function scale(mat4, sx, sy, sz){
    mat4[0] *= sx;
    mat4[4] *= sy;
    mat4[8] *= sz;
    return mat4;
}

export function mat4_transpose(mat4) {

    [ mat4[ 1], mat4[ 4] ] = [ mat4[ 4], mat4[ 1] ];
    [ mat4[ 2], mat4[ 8] ] = [ mat4[ 8], mat4[ 2] ];
    [ mat4[ 3], mat4[12] ] = [ mat4[12], mat4[ 3] ];

    [ mat4[ 6], mat4[ 9] ] = [ mat4[ 9], mat4[ 6] ];
    [ mat4[ 7], mat4[13] ] = [ mat4[13], mat4[ 7] ];    

    [ mat4[11], mat4[14] ] = [ mat4[14], mat4[11] ];

}


export function mat4_set_col(mat4, j, col) {
    mat4[j+ 0] = col[0];
    mat4[j+ 4] = col[1];
    mat4[j+ 8] = col[2];
    mat4[j+12] = col[3];
}


export function mat4_set_row(mat4, i, row) {
    mat4[4*i+0] = row[0];
    mat4[4*i+1] = row[1];
    mat4[4*i+2] = row[2];
    mat4[4*i+3] = row[3];
}


export function mat4_get_topleft_mat3(mat4, mat3) {
    mat3[ 0] = mat4[ 0]; mat3[ 1] = mat4[ 1]; mat3[ 2] = mat4[ 2];
    mat3[ 3] = mat4[ 4]; mat3[ 4] = mat4[ 5]; mat3[ 5] = mat4[ 6];
    mat3[ 6] = mat4[ 8]; mat3[ 7] = mat4[ 9]; mat3[ 8] = mat4[10];
}


export function mat4_set_topleft_mat3(mat4, mat3) {
    mat4[ 0] = mat3[ 0]; mat4[ 1] = mat3[ 1]; mat4[ 2] = mat3[ 2];
    mat4[ 4] = mat3[ 3]; mat4[ 5] = mat3[ 4]; mat4[ 6] = mat3[ 5];
    mat4[ 8] = mat3[ 6]; mat4[ 9] = mat3[ 7]; mat4[10] = mat3[ 8];
}


export function mat4_mul_vec4(res, M, v) {
    res[0] = M[ 0]*v[0] + M[ 1]*v[1] + M[ 2]*v[2] + M[ 3]*v[3];
    res[1] = M[ 4]*v[0] + M[ 5]*v[1] + M[ 6]*v[2] + M[ 7]*v[3];
    res[2] = M[ 8]*v[0] + M[ 9]*v[1] + M[10]*v[2] + M[11]*v[3];
    res[3] = M[12]*v[0] + M[13]*v[1] + M[14]*v[2] + M[15]*v[3];
}


export function mat4_mul_mat4(res4, A4, B4) {

    res4[ 0] = A4[ 0]*B4[ 0] + A4[ 1]*B4[ 4] + A4[ 2]*B4[ 8] + A4[ 3]*B4[12];
    res4[ 4] = A4[ 4]*B4[ 0] + A4[ 5]*B4[ 4] + A4[ 6]*B4[ 8] + A4[ 7]*B4[12];
    res4[ 8] = A4[ 8]*B4[ 0] + A4[ 9]*B4[ 4] + A4[10]*B4[ 8] + A4[11]*B4[12];
    res4[12] = A4[12]*B4[ 0] + A4[13]*B4[ 4] + A4[14]*B4[ 8] + A4[15]*B4[12];

    res4[ 1] = A4[ 0]*B4[ 1] + A4[ 1]*B4[ 5] + A4[ 2]*B4[ 9] + A4[ 3]*B4[13];
    res4[ 5] = A4[ 4]*B4[ 1] + A4[ 5]*B4[ 5] + A4[ 6]*B4[ 9] + A4[ 7]*B4[13];
    res4[ 9] = A4[ 8]*B4[ 1] + A4[ 9]*B4[ 5] + A4[10]*B4[ 9] + A4[11]*B4[13];
    res4[13] = A4[12]*B4[ 1] + A4[13]*B4[ 5] + A4[14]*B4[ 9] + A4[15]*B4[13];

    res4[ 2] = A4[ 0]*B4[ 2] + A4[ 1]*B4[ 6] + A4[ 2]*B4[10] + A4[ 3]*B4[14];
    res4[ 6] = A4[ 4]*B4[ 2] + A4[ 5]*B4[ 6] + A4[ 6]*B4[10] + A4[ 7]*B4[14];
    res4[10] = A4[ 8]*B4[ 2] + A4[ 9]*B4[ 6] + A4[10]*B4[10] + A4[11]*B4[14];
    res4[14] = A4[12]*B4[ 2] + A4[13]*B4[ 6] + A4[14]*B4[10] + A4[15]*B4[14];

    res4[ 3] = A4[ 0]*B4[ 3] + A4[ 1]*B4[ 7] + A4[ 2]*B4[11] + A4[ 3]*B4[15];
    res4[ 7] = A4[ 4]*B4[ 3] + A4[ 5]*B4[ 7] + A4[ 6]*B4[11] + A4[ 7]*B4[15];
    res4[11] = A4[ 8]*B4[ 3] + A4[ 9]*B4[ 7] + A4[10]*B4[11] + A4[11]*B4[15];
    res4[15] = A4[12]*B4[ 3] + A4[13]*B4[ 7] + A4[14]*B4[11] + A4[15]*B4[15];

}


export function mat4_set_orthogonal(mat4, left, right, bottom, top, near, far) {
    let irl = 1.0 / (right-left);
    let itb = 1.0 / (top-bottom);
    let ifn = 1.0 / (far-near);
    mat4.set([
        2.0*irl, 0.0, 0.0, (right+left)*irl,
        0.0, 2.0*itb, 0.0, (top+bottom)*itb,
        0.0, 0.0, 2.0*ifn, (far+near)*ifn,
        0.0, 0.0, 0.0, 1.0
    ]);
}


export function mat4_set_perspective(mat4, fov, aspect, near, far) {
    let tfd2 = Math.tan(fov*0.5);
    let fmn = 1.0 / (near - far);
    
    mat4.set([
        1.0 / (aspect * tfd2), 0.0, 0.0, 0.0,
        0.0, 1.0 / (tfd2), 0.0, 0.0,
        0.0, 0.0, fmn*(far+near), fmn*(2.0*far*near),
        0.0, 0.0, -1.0, 0.0
    ]);
}


export function vec3_normalize(arr3) {
    let factor = 1.0 / Math.sqrt(arr3[0]*arr3[0] + arr3[1]*arr3[1] + arr3[2]*arr3[2]);
    arr3[0] *= factor;
    arr3[1] *= factor;
    arr3[2] *= factor;
}


// cross product: 
//   - produces a vector that is orthogonal to vA and vB
//   - norm(cross(vA,vB))==1 if norm(vA) == norm(vB) == 1
//   - entries come from wedge product in 3D
export function vec3_cross(cross, vA, vB) {
    cross[0] = vA[1]*vB[2] - vA[2]*vB[1];
    cross[1] = vA[2]*vB[0] - vA[0]*vB[2];
    cross[2] = vA[0]*vB[1] - vA[1]*vB[0];
}


export function mat4_set_lookat_deprecated(mat4, eye, center, up) {
    let forward = [center[0] - eye[0], center[1] - eye[1], center[2] - eye[2]];
    let side = [0,0,0];
    
    vec3_normalize(forward);
    vec3_normalize(up);
    vec3_cross(side, forward, up);
    vec3_normalize(side);
    vec3_cross(up, side, forward);
    
    mat4[ 0] =     side[0]; mat4[ 1] =     side[1]; mat4[ 2] =     side[2];
    mat4[ 4] =       up[0]; mat4[ 5] =       up[1]; mat4[ 6] =       up[2];
    mat4[ 8] = -forward[0]; mat4[ 9] = -forward[1]; mat4[10] = -forward[2]; 
    
    mat4[ 3] = -    side[0]*eye[0] -    side[1]*eye[1] -    side[2]*eye[2];
    mat4[ 7] = -      up[0]*eye[0] -      up[1]*eye[1] -      up[2]*eye[2];
    mat4[11] = + forward[0]*eye[0] + forward[1]*eye[1] + forward[2]*eye[2];

    mat4[12] = 0.0;   mat4[13] = 0.0; mat4[14] = 0.0; mat4[15] = 1.0;
}

export function mat4_set_lookat(mat4, eye, center, up) {
    let forward = [center[0] - eye[0], center[1] - eye[1], center[2] - eye[2]];
    let up_unit = [up[0], up[1], up[2]]
    let side = [0,0,0];

    vec3_normalize(forward);
    vec3_normalize(up_unit);
    vec3_cross(side, forward, up_unit);
    vec3_normalize(side);
    vec3_cross(up_unit, side, forward);

    mat4[ 0] =     side[0]; mat4[ 1] =     side[1]; mat4[ 2] =     side[2];
    mat4[ 4] =  up_unit[0]; mat4[ 5] =  up_unit[1]; mat4[ 6] =   up_unit[2];
    mat4[ 8] = -forward[0]; mat4[ 9] = -forward[1]; mat4[10] = -forward[2];

    mat4[ 3] = -    side[0]*eye[0] -    side[1]*eye[1] -    side[2]*eye[2];
    mat4[ 7] = - up_unit[0]*eye[0] - up_unit[1]*eye[1] - up_unit[2]*eye[2];
    mat4[11] = + forward[0]*eye[0] + forward[1]*eye[1] + forward[2]*eye[2];

    mat4[12] = 0.0;   mat4[13] = 0.0; mat4[14] = 0.0; mat4[15] = 1.0;
}