var MyGauss = (function (exports) {

    // https://jsfiddle.net/flek/pct2qugr/175/
    class CustomBufferResource extends PIXI.Resource {
        constructor(source, options) {
          const { width, height, internalFormat, format, type } = options || {};
      
          if (!width || !height || !internalFormat || !format || !type) {
            throw new Error(
              'CustomBufferResource width, height, internalFormat, format, or type invalid'
            );
          }
      
          super(width, height);
      
          this.data = source;
          this.internalFormat = internalFormat;
          this.format = format;
          this.type = type;
        }
          
        upload(renderer, baseTexture, glTexture) {
          const gl = renderer.gl;
      
        //   gl.pixelStorei(
        //     gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,
        //     baseTexture.alphaMode === 1 // PIXI.ALPHA_MODES.UNPACK but `PIXI.ALPHA_MODES` are not exported
        //   );
          gl.pixelStorei(
            gl.UNPACK_ALIGNMENT,
            4
          );
      
          glTexture.width = baseTexture.width;
          glTexture.height = baseTexture.height;
      
          gl.texImage2D(
            baseTexture.target,
            0,
            gl[this.internalFormat],
            baseTexture.width,
            baseTexture.height,
            0,
            gl[this.format],
            gl[this.type],
            this.data
          );
      
          return true;
        }
      }
          
    function fillGaussArray( gaussDim, gaussianDeviation, gaussianHeight ) {
        gaussDensity = new Float32Array( gaussDim * gaussDim );
        		
        for( v = 0; v < gaussDim; ++v )
		{
			//pBits = ( float* )( ( char* )( Rect.pBits ) + v * Rect.Pitch );

			for( u = 0; u < gaussDim; ++u )
			{
				dx = 2.0 * u / ( gaussDim - 1.0 ) - 1;
				dy = 2.0 * v / ( gaussDim - 1.0 ) - 1;
				I = gaussianHeight * Math.exp( -( dx * dx + dy * dy ) / gaussianDeviation );
				gaussDensity[u+v*gaussDim] = I;
			}
		}
        return gaussDensity;
    }
    
    let setupGauss = function setupGaussFn( gaussDim, gaussianDeviation, gaussianHeight ) {
        
        // NOTE: the shaders are not used for Gauss rendering - they are treated as sprites instead
        // Build geometry.
        const geometry = new PIXI.Geometry()
            .addAttribute('aVertexPosition', // the attribute name
                [   0, 0, // x, y
                    gaussDim, 0, // x, y
                    gaussDim, gaussDim,
                    0, gaussDim], // x, y
                2) // the size of the attribute
            .addAttribute('aUvs', // the attribute name
                [0, 0, // u, v
                    1, 0, // u, v
                    1, 1,
                    0, 1], // u, v
                2) // the size of the attribute
            .addIndex([0, 1, 2, 0, 2, 3]);

        // NOTE: the shaders are not used for Gauss rendering - they are treated as sprites instead
        // Vertex shader. 
        const vertexSrc = `

            precision mediump float;

            attribute vec2 aVertexPosition;
            attribute vec2 aUvs;

            uniform mat3 translationMatrix;
            uniform mat3 projectionMatrix;

            varying vec2 vUvs;

            void main() {

                vUvs = aUvs;
                gl_Position = vec4((projectionMatrix * translationMatrix * vec3(aVertexPosition, 1.0)).xy, 0.0, 1.0);

        }`;
        
        // NOTE: the shaders are not used for Gauss rendering - they are treated as sprites instead
        const fragmentGaussSrc = `
        precision mediump float;
        varying vec2 vUvs;
        //uniform float amount;
        //uniform float phase;
        uniform sampler2D texIn;

        void main()
        {
            //Generate a simple grid.
            vec2 uv = vUvs;
            //Calculate distance from center
            //float distance = length( uv - vec2(0.5));
            vec4 color = texture2D(texIn, uv);
            
            color *= 0.001;
            //color = vec4( 0.0 );
            
            color.a = color.r;
            gl_FragColor = color;
        }`;

        gaussDensityArray = fillGaussArray( gaussDim, gaussianDeviation, gaussianHeight );
        //PIXI.MIPMAP_MODES:
        //options.mipmap
        //const gaussTexture = PIXI.Texture.fromBuffer ( gaussDensityArray, gaussDim, gaussDim, mipmap=PIXI.MIPMAP_MODES.OFF, format=PIXI.FORMATS.RED, type=PIXI.FLOAT );
        // const gaussTexture = PIXI.Texture.fromBuffer ( gaussDensityArray, gaussDim, gaussDim, 
        //     {   mipmap: PIXI.MIPMAP_MODES.OFF, 
        //         format: PIXI.FORMATS.RED, 
        //         type: PIXI.FLOAT,
        //     } );

        const gaussRawResource = new CustomBufferResource(gaussDensityArray, {
            width: gaussDim,
            height: gaussDim,
            internalFormat: 'R32F',
            format: 'RED',
            type: 'FLOAT'
          });
        const baseGaussDataTexture = new PIXI.BaseTexture(gaussRawResource /*, { scaleMode: PIXI.SCALE_MODES.NEAREST }*/ );
        const gaussTexture = new PIXI.Texture(baseGaussDataTexture);

          
        // https://lightrun.com/answers/pixijs-pixijs-single-channel-float-data-texture-with-webgl2-context
        // const createDataTexture = (dataArray, width, height) => {
        //     const resource = new PIXI.BufferResource(dataArray, { width, height });
        //     return new PIXI.BaseTexture(resource, {
        //       format: 0x822e, // gl.R32F 
        //       type: PIXI.FLOAT,
        //       mipmap: PIXI.MIPMAP_MODES.OFF,
        //     })
        // }     
        // const gaussTexture = createDataTexture(gaussDensityArray, gaussDim, gaussDim);        

        
        const gaussUniforms = {
            // amount: 0.5,
            // phase: 0,
            texIn: gaussTexture,
        };
        const gaussShader = PIXI.Shader.from(vertexSrc, fragmentGaussSrc, gaussUniforms);
        const gaussQuad = new PIXI.Mesh(geometry, gaussShader);
        const gaussContainer = new PIXI.Container();
        gaussContainer.addChild(gaussQuad);
        return [gaussContainer, gaussQuad, gaussTexture];
    }
    
    exports.setupGauss = setupGauss;
    
    return exports;

} )({});    