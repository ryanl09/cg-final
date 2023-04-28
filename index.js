import { vec3, mat4 } from 'gl-matrix';

Object.prototype.getKeys = () => {
    return Object.keys(this);
}

(function () {
    const canvas = document.getElementById('canvas');
    const gl = canvas.getContext('webgl2');

    let gltf = {};

    if(!gl){
        console.log('Web GL not available');
        return;
    }

    /* Animation */

    const atrack = 'track';
    const blendTime = 300;
    let last = 0;

    const activeAnimations = {};

    function getAnimationFromLast(t, k, offset = 0){
        if(activeAnimations[t]===undefined
            || activeAnimations[t][k] === undefined
            || activeAnimations[t][k].length-offset-1<0){
                return null;
            }
        
        return activeAnimations[t][k][active][activeAnimations[t][k].length-offset-1];
    }

    function addAnimation(t,k,m,a){
        const key = `${k}_${m}`;
        if(!activeAnimations[t]){
            activeAnimations[t] = [];
        }

        if(!activeAnimations[t][key]){
            activeAnimations[t][key] = [];
        }

        if(getAnimationFromLast(t,key).key === a){
            return;
        }
        activeAnimations[t][key].push({
            key:a,
            elapsed:0
        });

        activeAnimations[t][key].slice(activeAnimations[t][key].length-2);
    }

    const animationsEmpty = () => {
        return activeAnimations.getKeys().length === 0;
    }

    function getActiveAnimations(k,model){
        const key = `${k}_${m}`;
        const aa = {};
        const ok = activeAnimations.getKeys();
        if(ok.length===0){
            return null;
        }

        ok.forEach(e=>{
            if(!activeAnimations[e][key]){
                return;
            }
            aa[e]=activeAnimations[e][key].slice(activeAnimations[e][key].length-2);
        });
        return aa;
    }

    function stepAnimation(elapsed,k){
        activeAnimations.getKeys().forEach(x => {
            activeAnimations[x].getKeys().forEach(y => {
                if(k&&y.indexOf(k)!==0){
                    return;
                }
                const curr = getAnimationFromLast(x,y);
                const prev = getAnimationFromLast(x,y,1);
                if(curr){
                    curr.elapsed+=elapsed;
                }
                if(prev){
                    prev.elapsed+=elapsed;
                }
            });
        });
    }

    function getAnimations(models){
        models.forEach(e => {
            if(e.getKeys().length===0) {
                return;
            }
            addAnimation(atrack,'default',e.name,e.animations.getKeys()[0]);
            /*TODO: add animation buttons after load */
        });
    }

    function getAnimationTransforms(model){
        const ts = {};
        activeAnimations.getKeys().forEach(e=>{
            activeAnimations[e].forEach(f => {
                const blend = -((f.elapsed-blendTime)/blendTime);
                model.animations[f.key].getKeys().forEach(g=>{
                    const t = 0;
                })
            })
        });
    }

    /* Camera */

    const cam = {
        update: function(c, vw, vh) {
            const pmat = mat4.create();
            const vmat = mat4.create();
            const pos = vec3.fromValues(
                c.dist*Math.sin(-c.y)*Math.cos(-c.x),
                c.dist*Math.sin(c.x),
                c.dist*Math.cos(-c.y)*Math.cos(-c.x)
            );
            mat4.translate(vmat, vmat, vec3.fromValues(0,0,-c.dist));
            mat4.rotate(vmat,vmat,c.x);
            mat4.rotate(vmat,vmat,c.y);
            mat4.perspective(pmat,45,vw/vh,.1,100);
            return {pmat,vmat,pos};
        }
    }

    /* Cubemap */

    const cubemap = {
        getImage: async function(uri){
            return new Promise(resolve => {
                const i = new Image();
                i.onload=function(){
                    resolve(i);
                }
                i.src=uri;
            });
        },
        create: function(tx){
            const c = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, c);
            tx.forEach((e,i)=>{
                gl.textImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, e);
            })
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER,gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
            return c;
        },
        load: async function() {
            const n = ['right','left','top','bottom','front','back'];
            const diffusetex=await Promise.all(n.map(e=>this.getImage(`env/diffuse_${n}.jpg`)));
            const speculartex = await Promise.all(n.map(e=>this.getImage(`env/specular_${n}.jpg`)));

            const diff = this.create(gl, diffusetex);
            const spec = this.create(gl,speculartex);
            const brdftex = await this.getImage('env/brdf_lut.png');
            const brdf = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, brdf);
            gl.textImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.USIGNED_BYTE, brdftex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.generateMipmap(gl.TEXTURE_2D);
            if(!diff||!spec||!brdf){
                console.log('Failed to load environment');
            }

            return {
                diff,
                spec,
                brdf
            };
        },
        bind:function(env,brdf,diff,spec){
            gl.activeTexture(gl.TEXTURE5);
            gl.bindTexture(gl.TEXTURE_2D, env.brdf);
            gl.uniform1i(brdf);
            gl.activeTexture(gl.TEXTURE6);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, env.diff);
            gl.uniform1i(diff, 6);
            gl.activeTexture(gl.TEXTURE7);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, env.spec);
            gl.uniform1i(spec,7);
        }
    }

    /* util */

    function get (c,elapsed) {
        const t = c && c.translation.length > 0 ? getTransform(c.translation, elapsed): vec3.create();
        const r = c && c.rotation.length > 0 ? getTransform(c.rotation, elapsed): quat.create();
        const s = c && c.scale.length > 0 ? getTransform(c.scale, elapsed): vec3.fromValues(1, 1, 1);
        return { t, r, s };
    };

    /* View */

    const camera = {
        x: 0.0,
        y: 0.0,
        dist:3.0
    };

    function setSize() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width=window.innerWidth * dpr;
        canvas.height=window.innerHeight * dpr;
        gl.viewport(0,0,canvas.width,canvas.height);
    }

    function render(u,models){
        gl.clear(gl.COLOR_BUFFER_BIT);
        const cammat = cam.update(camera, canvas.width, canvas.height);
        gl.uniform3f(u.camPos, cammat.pos[0], cammat.pos[1],cammat.pos[2]);
        gl.uniformMatrix4fv(u.pmat, false, cammat.pmat);
        gl.uniformMatrix4fv(u.vmat, false, cammat.vmat);
        models.forEach(e=>{
            const a = getAniam
        });
    }

    /* */

    
})();