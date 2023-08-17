"use strict";

import * as PIXI from './pixijs/pixi.js';

export
var MySphere = (function (exports) {
    
    let setupSphere = function setupSphereFn( radius, instanceCount ) {

        let numVerts = 9;
        let spherePosArray = new Float32Array( 3 * numVerts * 2 );
        
        var lastX = radius;
        var lastY = 0.0;
        for ( let i = 1; i <= numVerts; i++ ) {
            let currAngle = i * 2.0 * Math.PI / numVerts;
            let currX = Math.cos( currAngle ) * radius;
            let currY = Math.sin( currAngle ) * radius;
            spherePosArray[i*6+0-6] = 0.0;
            spherePosArray[i*6+1-6] = 0.0;
            spherePosArray[i*6+2-6] = lastX;
            spherePosArray[i*6+3-6] = lastY;            
            spherePosArray[i*6+4-6] = currX;
            spherePosArray[i*6+5-6] = currY;
            lastX = currX;
            lastY = currY;
        }
        
        const geometry = new PIXI.Geometry()
            //.addAttribute('aVertexPosition', [-100, -50, 100, -50, 0, 100]);
            .addAttribute('aVPos', spherePosArray);

        geometry.instanced = true;
        geometry.instanceCount = instanceCount;
        const positionSize = 2;
        const colorSize = 3;
        const buffer = new PIXI.Buffer(new Float32Array(geometry.instanceCount * (positionSize + colorSize)));
        geometry.addAttribute('aIPos', buffer, positionSize, false, PIXI.TYPES.FLOAT, 4 * (positionSize + colorSize), 0, true);
        geometry.addAttribute('aICol', buffer, colorSize, false, PIXI.TYPES.FLOAT, 4 * (positionSize + colorSize), 4 * positionSize, true);
        for (let i = 0; i < geometry.instanceCount; i++) {
            const instanceOffset = i * (positionSize + colorSize);
            buffer.data[instanceOffset + 0] = i * 80;
            buffer.data[instanceOffset + 2] = Math.random();
            buffer.data[instanceOffset + 3] = Math.random();
            buffer.data[instanceOffset + 4] = Math.random();
        }            
            
        let myMat = new PIXI.Matrix().translate( 125.0, 0.0);
        let projMat = new PIXI.Matrix();
        
        // const uniforms = {
        //     myMat: myMat,
        // };
        // const shader = PIXI.Shader.from(
        // `
        //     precision mediump float;
        //     attribute vec2 aVertexPosition;

        //     uniform mat3 translationMatrix; // attention: built-in!
        //     uniform mat3 projectionMatrix;  // attention: built-in!
        //     uniform mat3 myMat;             // user can set this

        //     void main() {
        //         gl_Position = vec4((projectionMatrix * myMat * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);
        //     }
        // `,
        // `
        //     precision mediump float;
            
        //     void main() {
        //         //gl_FragColor = vec4(0.2, 0.8, 0.1, 1.0);
        //         gl_FragColor = vec4(0.8, 0.8, 0.8, 1.0);
        //     }
        // `,
        // uniforms
        // );
        const shader = PIXI.Shader.from(`
            precision mediump float;
            attribute vec2 aVPos;
            attribute vec2 aIPos;
            attribute vec3 aICol;

            uniform mat3 translationMatrix;
            uniform mat3 projectionMatrix;

            varying vec3 vCol;

            void main() {
                vCol = aICol;

                gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVPos + aIPos, 1.0)).xy, 0.0, 1.0);
            }`,

        `precision mediump float;

            varying vec3 vCol;

            void main() {
                gl_FragColor = vec4(vCol, 1.0);
            }

        `);

        const sphere = new PIXI.Mesh(geometry, shader);

        sphere.position.set(200, 300);

        return sphere;
    };
    
    exports.setupSphere = setupSphere;
    
    return exports;
} )({});