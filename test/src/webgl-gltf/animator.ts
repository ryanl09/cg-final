
import { mat4, vec3, quat } from 'gl-matrix';
import { KeyFrame, Model, Skin, Transform } from './types/model';
import { ActiveAnimation } from './animation';

const getPreviousAndNextKeyFrame = (keyFrames: KeyFrame[], animationTime: number) => {
    let next = keyFrames[0];
    let previous = keyFrames[0];

    for (let i = 1; i < keyFrames.length; i ++) {
        next = keyFrames[i];
        if (next.time > animationTime) break;

        previous = keyFrames[i];
    }

    return { previous, next };
};

const getTransform = (keyFrames: KeyFrame[], duration: number) => {
    if (keyFrames.length === 1) {
        switch(keyFrames[0].type) {
            case 'translation':
            case 'scale':
                return keyFrames[0].transform as vec3;
            case 'rotation':
                return keyFrames[0].transform as quat;
        }
    }

    const animationTime = duration / 1000.0 % keyFrames[keyFrames.length - 1].time;
    const frames = getPreviousAndNextKeyFrame(keyFrames, animationTime);
    const progression = (animationTime - frames.previous.time) / (frames.next.time - frames.previous.time);

    switch(frames.previous.type) {
        case 'translation':
        case 'scale': {
            const result = vec3.create();
            vec3.lerp(result, frames.previous.transform as vec3, frames.next.transform as vec3, progression);
            return result;
        }
        case 'rotation': {
            const result = quat.create();
            quat.slerp(result, frames.previous.transform as quat, frames.next.transform as quat, progression);
            return result;
        }
    }
};

interface TransformMatrices {
    [key: number]: mat4;
}

const get = (c: Transform, elapsed: number) => {
    const t = c && c.translation.length > 0 ? getTransform(c.translation, elapsed) as vec3 : vec3.create();
    const r = c && c.rotation.length > 0 ? getTransform(c.rotation, elapsed) as quat : quat.create();
    const s = c && c.scale.length > 0 ? getTransform(c.scale, elapsed) as vec3 : vec3.fromValues(1, 1, 1);
    return { t, r, s };
};

const applyTransform = (model: Model, appliedTransforms: mat4[], transforms: TransformMatrices, matrix: mat4, skin: Skin, nodeIndex: number, inverse: boolean) => {
    const node = model.nodes[nodeIndex];
    const transformIndex = skin.joints.indexOf(node.id);

    if (transforms[node.id] !== undefined) {
        mat4.multiply(matrix, matrix, transforms[node.id]);
    }

    if (inverse) {
        const ibt = skin.inverseBindTransforms[transformIndex];

        if (ibt) {
            appliedTransforms[transformIndex] = mat4.create();
            mat4.multiply(appliedTransforms[transformIndex], matrix, ibt);
        }
    } else {
        appliedTransforms[transformIndex] = matrix;
    }

    node.children.forEach(childNode => {
        applyTransform(model, appliedTransforms, transforms, mat4.clone(matrix), skin, childNode, inverse);
    });
};

/**
 * Blends two animations and returns their transform matrices
 * @param model GLTF Model
 * @param activeAnimations Currently running animations
 * @param blendTime Length of animation blend in milliseconds
 */
const getAnimationTransforms = (model: Model, activeAnimations: Record<string, ActiveAnimation[]>, blendTime = 0) => {
    const transforms: { [key: number]: mat4 } = {};

    Object.keys(activeAnimations).forEach(track => {
        activeAnimations[track].forEach(rootAnimation => {
            const blend = -((rootAnimation.elapsed - blendTime) / blendTime);

            Object.keys(model.animations[rootAnimation.key]).forEach(c => {
                const transform = get(model.animations[rootAnimation.key][c], rootAnimation.elapsed);

                activeAnimations[track].forEach(ac => {
                    if (rootAnimation.key == ac.key || blend <= 0) return;

                    const cTransform = get(model.animations[ac.key][c], ac.elapsed);
                    vec3.lerp(transform.t, transform.t, cTransform.t, blend);
                    quat.slerp(transform.r, transform.r, cTransform.r, blend);
                    vec3.lerp(transform.s, transform.s, cTransform.s, blend);
                });

                const localTransform = mat4.create();
                const rotTransform = mat4.create();
                mat4.fromQuat(rotTransform, transform.r as quat);

                mat4.translate(localTransform, localTransform, transform.t as vec3);
                mat4.multiply(localTransform, localTransform, rotTransform);
                mat4.scale(localTransform, localTransform, transform.s as vec3);

                transforms[c] = localTransform;
            });
        });
    });

    return transforms;
};

/**
 * Applies transforms to skin
 * @param model GLTF Model
 * @param transforms Raw transforms
 * @param blendTime Use inverse bind transform
 */
const applyToSkin = (model: Model, transforms: { [key: number]: mat4 }, inverse = true) => {
    const appliedTransforms: mat4[] = [];

    model.skins.forEach(skin => {
        const root = model.rootNode;
        applyTransform(model, appliedTransforms, transforms, mat4.create(), skin, root, inverse);
    });

    return appliedTransforms;
};

export {
    getAnimationTransforms,
    applyToSkin,
};
