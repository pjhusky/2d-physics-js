var MyFilterShaders = (function (exports) {
    
    exports.printDefaultVertexShader = function printDefaultVertexShader() {
        console.log( PIXI.Filter.defaultVertexSrc ); // DEBUG: print default vertex shader, so we can mod it later on
    };
    
    // based on default vertex shader used by pixijs
    exports.myVertexSrc = 
    `   
        attribute vec2 aVertexPosition;
        uniform mat3 projectionMatrix;
        varying vec2 vTextureCoord;
        varying vec2 v_fullscreenTC;
        uniform vec4 inputSize;
        uniform vec4 outputFrame;

        vec4 filterVertexPosition( void )
        {
            vec2 position = aVertexPosition * max(outputFrame.zw, vec2(0.)) + outputFrame.xy;

            return vec4((projectionMatrix * vec3(position, 1.0)).xy, 0.0, 1.0);
        }

        vec2 filterTextureCoord( void )
        {
            return aVertexPosition * (outputFrame.zw * inputSize.zw);
        }

        void main(void)
        {
            gl_Position = filterVertexPosition();
            vTextureCoord = filterTextureCoord();
            
            //v_fullscreenTC = aVertexPosition.xy * 2.0 - 1.0;
            v_fullscreenTC = aVertexPosition.xy;
        }
    `;            

    exports.metaballFilterFragmentSrc = 
    `   
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        void main(void) {
            //gl_FragColor = texture2D(uSampler, vTextureCoord);
            //gl_FragColor = 1.0 - texture2D(uSampler, vTextureCoord);
            
            vec4 color = texture2D(uSampler, vTextureCoord);
            color.rgb = vec3( step( 0.5, color.r ) );
            color.a = color.r;
            gl_FragColor = color;
        }                
    `;
    
    exports.outlineFilterFragmentSrc = 
    `   
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform vec2 u_rDim;
        void main(void) {
            //gl_FragColor = 1.0 - texture2D(uSampler, vTextureCoord);
            float c_mx = texture2D(uSampler, vTextureCoord + vec2( -u_rDim.x, 0.0 ) ).r ;
            float c_px = texture2D(uSampler, vTextureCoord + vec2( +u_rDim.x, 0.0 ) ).r ;
            float c_my = texture2D(uSampler, vTextureCoord + vec2( 0.0, -u_rDim.y ) ).r ;
            float c_py = texture2D(uSampler, vTextureCoord + vec2( 0.0, +u_rDim.y ) ).r ;
            float diff = abs( c_px - c_mx ) + abs( c_py - c_my );
            gl_FragColor = vec4( step( 0.5, diff ) );
        }
    `;
    
    exports.metaballNormalsFilterFragmentSrc = 
    `   
        varying vec2 vTextureCoord;
        varying vec2 v_fullscreenTC;
        uniform sampler2D uSampler;
        uniform sampler2D u_envMapTex;
        uniform sampler2D u_sceneMapTex;
        uniform float u_recipMaxGaussAccum;
        uniform vec2 u_rDim;
        void main(void) { 
            vec2 tc = vTextureCoord;
            vec2 tcFull = v_fullscreenTC;

            vec4 color = texture2D(uSampler, tc);
            color.a = step( 0.075, color.r );       
            
            vec2 off = u_rDim * 5.25;
            float c_mx = texture2D(uSampler, tc + vec2( -off.x, 0.0 ) ).r;
            float c_px = texture2D(uSampler, tc + vec2( +off.x, 0.0 ) ).r;
            float c_py = texture2D(uSampler, tc + vec2( 0.0, -off.y ) ).r;
            float c_my = texture2D(uSampler, tc + vec2( 0.0, +off.y ) ).r;

            vec2 diff = vec2( c_px - c_mx, c_py - c_my );
            diff *= u_recipMaxGaussAccum;
            vec3 N = normalize( vec3( diff.xy, 0.04 ) );
                        
            float densityHeight = color.r * 2.0;
            color.rgb = texture2D( u_envMapTex, normalize( vec3( N.xy * 0.5 + 0.5, densityHeight ) ).xy ).rgb;
            
            vec3 L = normalize( vec3( 0.3, 0.1, 0.9 ) );
            vec3 V = normalize( vec3( -0.01, -0.001, 1.0 ) );
            float diffuse = max( 0.0, dot( N, L ) );
            vec3 H = normalize( L + V );
            float specular = ( diffuse <= 0.0 ) ? 0.0 : max( 0.0, pow( dot( N, H ), 160.0 ) );
                
            //color.rgb = vec3( specular + diffuse * 0.6 );
            color.rgb *= vec3( specular + diffuse * 0.6 );
            
            //gl_FragColor = color; return; // show light intensities
            
            float alpha = color.a;
            gl_FragColor = mix( 
                //texture2D( u_sceneMapTex, vec2( 0.0, 1.0 ) + vec2( 1.0, -1.0 ) * gl_FragCoord.xy * 0.5 * u_rDim ), // without blur filtering
                texture2D( u_sceneMapTex, tcFull ), 
                //texture2D( u_sceneMapTex, tcFull * vec2( u_rDim.y / u_rDim.x, 1.0 ) + vec2( -0.25 * u_rDim.x / u_rDim.y, 0.0 ) ), 
                vec4( color.rgb, alpha ), 
                alpha ); 
            gl_FragColor.a = color.a;
        }                
    `;
    
    exports.metaballAlphaBasedFilterFragmentSrc = 
    `   
        varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform vec2 u_rDim;
        void main(void) {                        
            vec4 baseColor = texture2D(uSampler, vTextureCoord);
            //if ( baseColor.a <= 0.0 ) { gl_FragColor = baseColor; return; } 
            
            //vec2 off = u_rDim * 1.5;
            vec2 off = u_rDim * 1.33;
            vec3 blurColor = baseColor.rgb;
                                    
            blurColor += texture2D(uSampler, vTextureCoord + vec2( -off.x, -off.y ) ).rgb;
            blurColor += texture2D(uSampler, vTextureCoord + vec2( -off.x,    0.0 ) ).rgb;
            blurColor += texture2D(uSampler, vTextureCoord + vec2( -off.x, +off.y ) ).rgb;

            blurColor += texture2D(uSampler, vTextureCoord + vec2(    0.0, -off.y ) ).rgb;
            //blurColor += texture2D(uSampler, vTextureCoord + vec2(    0.0,    0.0 ) ).rgb;
            blurColor += texture2D(uSampler, vTextureCoord + vec2(    0.0, +off.y ) ).rgb;

            blurColor += texture2D(uSampler, vTextureCoord + vec2( +off.x, -off.y ) ).rgb;
            blurColor += texture2D(uSampler, vTextureCoord + vec2( +off.x,    0.0 ) ).rgb;
            blurColor += texture2D(uSampler, vTextureCoord + vec2( +off.x, +off.y ) ).rgb;
            
            blurColor *= 0.1111111111; // divide by 9 (= number of filter taps = blur samples)
            
            //gl_FragColor = vec4( blurColor, baseColor.a );
            gl_FragColor = mix( baseColor, vec4( blurColor, baseColor.a ), baseColor.a );
        }                
    `;
    
    exports.metaballDiffFilterFragmentSrc = 
    `   varying vec2 vTextureCoord;
        uniform sampler2D uSampler;
        uniform sampler2D u_envMapTex;
        uniform sampler2D u_sceneMapTex;
        uniform vec2 u_rDim;
        void main(void) {                        
            vec4 color = texture2D(uSampler, vTextureCoord);
            vec2 off = u_rDim;
            
            float c_mx = texture2D(uSampler, vTextureCoord + vec2( -off.x, 0.0 ) ).r;
            float c_px = texture2D(uSampler, vTextureCoord + vec2( +off.x, 0.0 ) ).r;
            float c_py = texture2D(uSampler, vTextureCoord + vec2( 0.0, -off.y ) ).r;
            float c_my = texture2D(uSampler, vTextureCoord + vec2( 0.0, +off.y ) ).r;

            vec3 diff = vec3( c_px - c_mx, c_py - c_my, 0.0 );
            
            //gl_FragColor = vec4( diff, 1.0 );
            gl_FragColor = vec4( diff + 0.5, 1.0 );
        }                
    `;
    
    exports.crtFilterFragmentSrc = 
    `
        varying vec2 vTextureCoord;
        varying vec2 v_fullscreenTC;
        uniform sampler2D uSampler;
        uniform sampler2D u_envMapTex;
        uniform sampler2D u_sceneMapTex;
        uniform float u_time;
        uniform vec2 u_rDim;
        uniform vec2 u_dim;
        vec2 curve(vec2 uv)
        {
            uv = uv * 2.0 - 1.0;
            uv *= 1.1;	
            uv.x *= 1.0 + pow((abs(uv.y) / 5.0), 2.0);
            uv.y *= 1.0 + pow((abs(uv.x) / 4.0), 2.0);
            uv  = uv * 0.5 + 0.5;
            uv =  uv *0.92 + 0.04;
            
            // // running up artifact scanline shifted left/right
            // //float stepVal = ( step( 0.0, 3.2 * sin( uv.y * 5.5 + u_time ) ) * 2.0 - 1.0 );
            // float stepVal = abs( 3.2 * sin( uv.y * 2.5 + 0.5*u_time ) );
            // uv.y += ( 1.0 - stepVal ) * u_rDim.y * 0.5;
            // stepVal *= (0.5 - abs( uv.x - 0.5 ))*2.0;
            // uv.x += 0.83 * u_rDim.x * stepVal;
            
            
            return uv;
        }
        void main( /*out vec4 fragColor, in vec2 fragCoord*/ )
        {
            vec2 origTC = vTextureCoord.xy;
            //vec2 tcFullRT = gl_FragCoord.xy * 0.5 * u_rDim;
            //vec2 origTC = tcFullRT;
            //vec2 tcFull = gl_FragCoord.xy * 0.5 * u_rDim; tcFull.y = 1.0 - tcFull.y; // only flip when reading texture
            vec2 tcFull = v_fullscreenTC;
            vec2 tcFullRT = vec2( 0.0, 1.0 ) + vec2( 1.0, -1.0 ) * v_fullscreenTC;
            
            //gl_FragColor.rgba = vec4( vTextureCoord, 0.0, 1.0 ); return;
            //gl_FragColor.rgba = vec4( origTC, 0.0, 1.0 ); return;
            //gl_FragColor.rgba = vec4( tcFull, 0.0, 1.0 ); return;
            
            //gl_FragColor.rgba = vec4( vec2( 0.0, 1.0 ) + vec2( 1.0, -1.0 ) * origTC, 0.0, 1.0 ); return;
            //gl_FragColor.rgba = vec4( vec2( 0.0, 1.0 ) + vec2( 1.0, -1.0 ) * tcFull, 0.0, 1.0 ); return;
            
            vec2 curvedTC = curve( tcFull );
            vec2 curvedTCSampler = curve( vTextureCoord );
            
            float glitch_x_shift_factor = 0.6 + 0.4 * clamp( pow( abs( 3.2 * sin( curvedTCSampler.y * 2.5 + 0.5*u_time ) ), 1.0/2.0 ), 0.0, 1.0 );
            //curvedTCSampler.x += ( 1.0 - pow( ( glitch_x_shift_factor ), 0.5 ) ) * 0.01 * sin( 7.3 * u_time + 6.0 * curvedTCSampler.y );
            curvedTCSampler.x += ( 1.0 - pow( ( glitch_x_shift_factor ), 0.75 ) ) * 0.01;
            //curvedTCSampler.x += ( 1.0 - glitch_x_shift_factor ) * 0.02;
            
            //gl_FragColor.rgba = vec4( curvedTC, 0.0, 1.0 ); return;
            
            vec3 origCol = texture2D( uSampler, origTC ).xyz;
            
            //gl_FragColor = vec4(origCol,1.0); return; // pass-through only
            
            vec3 col;
            //float x =  sin(0.3*u_time+curvedTCSampler.y*21.0)*sin(0.7*u_time+curvedTCSampler.y*29.0)*sin(0.3+0.33*u_time+curvedTCSampler.y*31.0)*0.0017;
            float x =  sin(0.3+curvedTCSampler.y*21.0)*sin(0.7+curvedTCSampler.y*29.0)*sin(0.3+0.33+curvedTCSampler.y*31.0)*0.0017;
            
            // float offS = 0.001;
            // float offL = 0.002;
            float offS = 0.0005;
            float offL = 0.0001;
            col.r = texture2D( uSampler, vec2(x + curvedTCSampler.x + offS, curvedTCSampler.y + offS ) ).x + 0.05;
            col.g = texture2D( uSampler, vec2(x + curvedTCSampler.x + 0.00, curvedTCSampler.y - offL ) ).y + 0.05;
            col.b = texture2D( uSampler, vec2(x + curvedTCSampler.x - offL, curvedTCSampler.y + 0.00 ) ).z + 0.05;
            float wRB = 0.08;
            float wG  = 0.05;
            // float wRB = 0.0;
            // float wG  = 0.0;
            
            //float stepVal = ( step( 0.0, 3.2 * sin( curvedTCSampler.y * 5.5 + u_time ) ) * 0.5 );
            float stepVal = ( step( 0.0, 3.2 * sin( curvedTCSampler.y * 5.5 ) ) * 0.5 );
            
            wRB += stepVal*0.02;
            col.r += wRB * texture2D( uSampler, stepVal * 0.75 * vec2( x + 0.025, -0.027 ) + vec2( curvedTCSampler.x + 0.001, curvedTCSampler.y + 0.001 ) ).x;
            col.g += wG  * texture2D( uSampler, 0.75 * vec2( x + -0.022, -0.02 ) + vec2( curvedTCSampler.x + 0.000, curvedTCSampler.y - 0.002 ) ).y;
            col.b += wRB * texture2D( uSampler, stepVal * 0.75 * vec2( x + -0.02, -0.018 ) + vec2( curvedTCSampler.x - 0.002, curvedTCSampler.y + 0.000 ) ).z;

            col = clamp(col*0.6+0.4*col*col*1.0,0.0,1.0);

            float vig = (0.0 + 1.0*16.0*curvedTC.x*curvedTC.y*(1.0-curvedTC.x)*(1.0-curvedTC.y)); // smooth vignetting
            //float vig = 1.0; // sharp vignetting
            col *= vec3(pow(vig,0.3));

            col *= vec3(0.95,1.05,0.95);
            col *= 2.8;

            //float scans = clamp( 0.35+0.35*sin(5.5*u_time+curvedTC.y*u_dim.y*1.5), 0.0, 1.0);
            float scans = clamp( 0.35+0.35*sin(5.5+curvedTC.y*u_dim.y*1.5), 0.0, 1.0);
            //float scans = clamp( 0.35+0.35*sin(3.5*u_time+origTC.y*u_dim.y*1.5), 0.0, 1.0);
            
            float s = pow(scans,1.7);
            col = col*vec3( 0.4+0.7*s) ;

            //col *= 1.0+0.01*sin(110.0*u_time);
            col *= 1.0+0.01*sin(110.0);
            //col *= 1.0+0.05*sin(110.0*u_time);
            if (curvedTC.x < 0.0 || curvedTC.x > 1.0) { col *= 0.0; }
            if (curvedTC.y < 0.0 || curvedTC.y > 1.0) { col *= 0.0; }
            
            col*=1.0-0.65*vec3(clamp((mod(gl_FragCoord.x, 2.0)-1.0)*2.0,0.0,1.0));
            
            //float comp = smoothstep( 0.1, 0.9, sin(u_time) );
            float comp = smoothstep( 0.1, 0.9, 0.5 );
            
            // SHIFT-glitch darken as well -> the same as in curve to shift coord left/right
            //col *= 0.6 + 0.4 * clamp( pow( abs( 3.2 * sin( curvedTCSampler.y * 2.5 + 0.5*u_time ) ), 1.0/2.0 ), 0.0, 1.0 );
            col *= glitch_x_shift_factor;
            //col *= 0.6 + 0.4 * clamp( pow( abs( 3.2 * sin( curvedTCSampler.y * 2.5 + 0.5 ) ), 1.0/2.0 ), 0.0, 1.0 );
        
            // Remove the next line to stop cross-fade between original and postprocess
            //col = mix( col, origCol, comp );

            gl_FragColor = vec4(col,1.0);
        }
    `;
    
    return exports;
    
} )({});