var ParticleFluidSolver = (function (exports) {

    function length ( vec ) {
        return Math.sqrt( vec.x * vec.x + vec.y * vec.y );
    }

    function normalize( vec ) {
        let len = length( vec );
        vec.x /= len;
        vec.y /= len;
    }

    function dot( vecA, vecB ) {
        return vecA.x * vecB.x + vecA.y * vecB.y;
    }
    
    function reflect( vec, N ) {
        let vecDotN = dot( vec, N );
        return { x: vec.x - 2.0 * vecDotN * N.x, y: vec.y - 2.0 * vecDotN * N.y };
    }
    
    let FluidParticle = class FluidParticleClass extends PIXI.Sprite {
        constructor(texture) {
            super(texture);
            this.speed = 0.0;
            this.lastPosX = 0.0;
            this.lastPosY = 0.0;
            this.accelX = 0.0;
            this.accelY = 0.0;
        }        
        updatePosition( dt ) {
            let velX = this.position.x - this.lastPosX;
            let velY = this.position.y - this.lastPosY;
            
            this.lastPosX = this.position.x;
            this.lastPosY = this.position.y;
            
            let damping = 0.9975;
            this.position.x += ( velX + this.accelX * dt * dt ) * damping;
            this.position.y += ( velY + this.accelY * dt * dt ) * damping;
            
            this.accelX = 0.0;
            this.accelY = 0.0;
        }

        updatePositionNoAccelReset( dt ) {
            let velX = this.position.x - this.lastPosX;
            let velY = this.position.y - this.lastPosY;
            
            this.lastPosX = this.position.x;
            this.lastPosY = this.position.y;
            
            let damping = 0.9975;
            this.position.x += ( velX + this.accelX * dt * dt ) * damping;
            this.position.y += ( velY + this.accelY * dt * dt ) * damping;
        }
        
        accelerate( aX, aY ) {
            this.accelX += aX;
            this.accelY += aY;
        }
    };
    
    let FluidSolverConstraintBase = class FluidSolverConstraintBaseClass {   
    };
    
    let FluidSolverConstraintCircle = class FluidSolverConstraintCircleClass extends FluidSolverConstraintBase {
        constructor( gridW, gridH, fluidParticleRadius ) {
            super();

            this.fluidParticleRadius = fluidParticleRadius;
            // boundary condition
            this.commonInit( gridW, gridH );
        }
        
        commonInit( newGridW, newGridH ) {
            this.circleBoundCenterX = newGridW * 0.5;
            this.circleBoundCenterY = newGridH * 0.5; //0.38;
            this.circleBoundRadius = Math.min( newGridW, newGridH ) * 0.46;
            //this.circleBoundRadius = Math.min( newGridW, newGridH ) * 0.5;
            this.circleBoundRadiusSquared = this.circleBoundRadius * this.circleBoundRadius;
            
            //this.testDistSquared = this.circleBoundRadiusSquared - 2.0 * this.circleBoundRadius * this.fluidParticleRadius - this.fluidParticleRadius*this.fluidParticleRadius;
            // this should be correct:
            this.testDistSquared = this.circleBoundRadiusSquared - 2.0 * this.circleBoundRadius * this.fluidParticleRadius + this.fluidParticleRadius*this.fluidParticleRadius;
        }
            
        onResolutionChanged( newGridW, newGridH ) {
            this.commonInit( newGridW, newGridH );
        }

        applyConstraint( fluidParticles, activeFluidParticles, dt ) {
            // enforce constraints / boundary conditions
            for (let i = 0; i < activeFluidParticles; i++) {
                let fluidParticle = fluidParticles[i];
                let toObjX = fluidParticle.position.x - this.circleBoundCenterX;
                let toObjY = fluidParticle.position.y - this.circleBoundCenterY;
                let distSquared = toObjX*toObjX + toObjY*toObjY;
                
                if ( distSquared > this.testDistSquared ) {
                    let dist = Math.sqrt( distSquared );
                    //let recipDist = 1.0 / dist;
                    //let fixDirX = toObjX * recipDist;
                    //let fixDirY = toObjY * recipDist;
                    let fixDirX = toObjX / dist;
                    let fixDirY = toObjY / dist;
                    
                    //fixDirX *= 0.995; // elasticity - a bit more lively!
                    //fixDirY *= 0.995; // elasticity - a bit more lively!
                    
                    if ( false ) { // don't bounce back, more viscous fluid-like
                        fluidParticle.position.x = this.circleBoundCenterX + fixDirX * ( this.circleBoundRadius - this.fluidParticleRadius*1.025 );
                        fluidParticle.position.y = this.circleBoundCenterY + fixDirY * ( this.circleBoundRadius - this.fluidParticleRadius*1.025 );
                    } else { // bounce off elastically
                        let normalX = fluidParticle.position.x - this.circleBoundCenterX;
                        let normalY = fluidParticle.position.y - this.circleBoundCenterY;
                        
                        let normalLen = Math.sqrt( normalX * normalX + normalY * normalY );
                        normalX /= normalLen;
                        normalY /= normalLen;
                        
                        let velX = fluidParticle.position.x - fluidParticle.lastPosX;
                        let velY = fluidParticle.position.y - fluidParticle.lastPosY;
                        
                        let velDotN = velX * normalX + velY * normalY;
                        let reflX = velX - 2.0 * velDotN * normalX;
                        let reflY = velY - 2.0 * velDotN * normalY;

                        // pos outside of constraint region
                        // fluidParticle.lastPosX = fluidParticle.position.x;
                        // fluidParticle.lastPosY = fluidParticle.position.y;
                        // pos insdie constraint region
                        fluidParticle.lastPosX = this.circleBoundCenterX + fixDirX * ( this.circleBoundRadius - this.fluidParticleRadius );
                        fluidParticle.lastPosY = this.circleBoundCenterY + fixDirY * ( this.circleBoundRadius - this.fluidParticleRadius );

                        fluidParticle.position.x = fluidParticle.lastPosX + reflX * 0.66;
                        fluidParticle.position.y = fluidParticle.lastPosY + reflY * 0.66;
                    }
                                        
                    fluidParticle.accelX = 0.0;                    
                    fluidParticle.accelY = 0.0;
                }
            }
        }                 
    };
    exports.FluidSolverConstraintCircle = FluidSolverConstraintCircle;
    
    let FluidSolver = class FluidSolverClass {

        constructor( gridW, gridH, 
                     maxNumFluidParticles, fluidParticleRadius, fluidParticleGravityX, fluidParticleGravityY, 
                     fixedDt, numSubSteps, 
                     constraints ) {
            
            this.fluidParticles = new Array();
            this.maxNumFluidParticles = maxNumFluidParticles;
            this.activeFluidParticles = 0;
            this.fluidParticleRadius = fluidParticleRadius;
            this.binDim = 2.0 * fluidParticleRadius;
            
            this.fluidParticleGravityX = fluidParticleGravityX;
            this.fluidParticleGravityY = fluidParticleGravityY;

            this.fixedDt = fixedDt;
            this.numSubSteps = numSubSteps;
            this.subFixedDt = fixedDt / numSubSteps;
                        
            this.constraints = constraints;
            
            let twofluidParticleRadius = 2.0 * fluidParticleRadius;
            this.twofluidParticleRadiusSquared = twofluidParticleRadius * twofluidParticleRadius;
                        
            this.commonInit( gridW, gridH );                         
        }
        
        getFluidParticles() { 
            return this.fluidParticles; 
        }
        
        // setParticleAtIdx( particle, idx ) { 
        //     this.fluidParticles[idx] = particle; 
        // }

        getParticleAtIdx( idx ) { 
            return this.fluidParticles[idx]; 
        }

        addParticle( particle ) { 
            this.activeFluidParticles++;
            this.fluidParticles.push( particle ); 
        }

        // addNewParticleAtIdx(idx) { 
        //     this.activeFluidParticles++; 
        //     return this.fluidParticles[idx]; 
        // }
        
        setActiveParticleCount( activeParticleCount ) {
            this.activeFluidParticles = activeParticleCount;
        }
        
        getMaxNumParticles() { 
            return this.maxNumFluidParticles; 
        }
        
        commonInit(gridW, gridH) {
            this.gridW = gridW;
            this.gridH = gridH;
            this.numBinsX = Math.floor( ( gridW + ( this.binDim - 1 ) ) / this.binDim ); // round up
            this.numBinsY = Math.floor( ( gridH + ( this.binDim - 1 ) ) / this.binDim ); // round up
            
            this.spatialArray = this.createSpatialBins();
        }
        
        onResolutionChanged( newGridW, newGridH ) {
            this.commonInit( newGridW, newGridH );
            this.createSpatialBins();
            
            for ( let constraintIdx = 0; constraintIdx < this.constraints.length; constraintIdx++ ) {
                this.constraints[constraintIdx].onResolutionChanged( newGridW, newGridH );
            }
        }
        
        createSpatialBins() { 
            console.log( 'created spatial bins' );
            this.spatialArray = new Array( this.numBinsY );
            console.log( 'numBinsX = %d, numBinsY = %d', this.numBinsX, this.numBinsY );
            //console.log( 'spatialArray.length %d, numBinsY = %d', this.spatialArray.length, this.numBinsY );
            for (let y = 0; y < this.numBinsY; y++) {
                this.spatialArray[y] = new Array( this.numBinsX );
                //console.log( '\tspatialArray[y].length %d, this.numBinsX = %d', this.spatialArray[y].length, this.numBinsX );
                for ( let x = 0; x < this.numBinsX; x++ ) {
                    this.spatialArray[y][x] = new Array();
                    //console.log( '\tspatialArray[%d][%d].length = %d', y, x, spatialArray[y][x].length );
                }
            }
            //return [numBinsX, numBinsY];
        }

        clearSpatialBins() {            
            //console.log( 'cleared spatial bins' );
            // let numBinsX = ( spatialArray[0].length + ( binDim - 1 ) ) / binDim;
            // let numBinsY = ( spatialArray.length    + ( binDim - 1 ) ) / binDim;
            for (let y = 0; y < this.numBinsY; y++) {
                for ( let x = 0; x < this.numBinsX; x++ ) {
                    this.spatialArray[y][x] = new Array();
                }
            }
        }

        updateFluidDriver() {
            if ( this.numSubSteps > 0 ) {
                for ( let step = 0; step < this.numSubSteps; step++ ) {
                    this.updateFluid( this.subFixedDt );
                }
            } else {
                this.updateFluid( this.fixedDt );
            }
        }
        
        updateFluid(dt) {

            this.clearSpatialBins();
            
            // insert particle into bin array for faster neighbor search
            for ( let i = 0; i < this.activeFluidParticles; i++ ) {
                let fluidParticle = this.fluidParticles[i];
                
                let binX = Math.floor( fluidParticle.position.x / this.binDim + 0.5 );
                let binY = Math.floor( fluidParticle.position.y / this.binDim + 0.5 );
                
                binX = AppUtils.clamp( binX, 0, this.numBinsX - 1 );
                binY = AppUtils.clamp( binY, 0, this.numBinsY - 1 );

                this.spatialArray[ binY ][ binX ].push( i );
            }
            
            // apply gravity
            for (let i = 0; i < this.activeFluidParticles; i++) {
                let fluidParticle = this.fluidParticles[ i ];
                // add gravity
                fluidParticle.accelerate( this.fluidParticleGravityX, this.fluidParticleGravityY );
            }
            
            // resolve collisions
            for (let i = 0; i < this.activeFluidParticles; i++) {
                let fluidParticleA = this.fluidParticles[i];

                let fluidParticleA_binX = Math.floor( fluidParticleA.position.x / this.binDim + 0.5 );
                let fluidParticleA_binY = Math.floor( fluidParticleA.position.y / this.binDim + 0.5 );
                // let fluidParticleA_binX = Math.floor( fluidParticleA.position.x / binDim );
                // let fluidParticleA_binY = Math.floor( fluidParticleA.position.y / binDim );

                let binY_start = Math.max( fluidParticleA_binY - 1, 0 );
                let binY_end   = Math.min( fluidParticleA_binY + 1, this.numBinsY - 1 );

                let binX_start = Math.max( fluidParticleA_binX - 1, 0 );
                let binX_end   = Math.min( fluidParticleA_binX + 1, this.numBinsX - 1 );
                
                for ( let binY = binY_start; binY <= binY_end; binY++ ) { 
                    for ( let binX = binX_start; binX <= binX_end; binX++ ) { 
                        for ( let ki = 0; ki < this.spatialArray[ binY ][ binX ].length; ki++ ) {
                            
                            let otherFluidParticledx = this.spatialArray[ binY ][ binX ][ ki ];
                            if ( i == otherFluidParticledx ) { continue; }
                            let fluidParticleB = this.fluidParticles[otherFluidParticledx]; 
                                                            
                            let diffX = fluidParticleA.position.x - fluidParticleB.position.x;
                            let diffY = fluidParticleA.position.y - fluidParticleB.position.y;
                            let diffLenSquared = diffX*diffX + diffY*diffY;
                            if (diffLenSquared < this.twofluidParticleRadiusSquared) {
                                let diffLen = Math.sqrt( diffLenSquared );
                                
                                let fixDirX = diffX / diffLen;
                                let fixDirY = diffY / diffLen;
                                
                                //let halfDeltaLen = 0.5 * ( 2.0f * this.fluidParticleRadius - diffLen );
                                let halfDeltaLen = this.fluidParticleRadius - 0.5 * diffLen;
                                
                                //halfDeltaLen *= 1.2; // elasticity - a bit more lively!
                                
                                fluidParticleA.position.x += fixDirX * halfDeltaLen;
                                fluidParticleA.position.y += fixDirY * halfDeltaLen;
                                
                                fluidParticleB.position.x -= fixDirX * halfDeltaLen;
                                fluidParticleB.position.y -= fixDirY * halfDeltaLen;
                                
                                fluidParticleA.accelX = 0.0;
                                fluidParticleA.accelY = 0.0;
                                //! fluidParticleA.accelY = Math.min( 0.0, fixDirY );
                                
                                fluidParticleB.accelX = 0.0;
                                fluidParticleB.accelY = 0.0;
                                //! fluidParticleB.accelY = Math.min( 0.0, -fixDirY );
                            }
                        }
                    }
                }                        
            }

            // enforce constraints
            for ( let constraintIdx = 0; constraintIdx < this.constraints.length; constraintIdx++ ) {
                this.constraints[ constraintIdx ].applyConstraint( this.fluidParticles, this.activeFluidParticles, dt );
            }
            
            // update positions
            for (let i = 0; i < this.activeFluidParticles; i++) {
                let fluidParticle = this.fluidParticles[i];
                fluidParticle.updatePosition( dt );
            }                    
        }
    
    };
    
    let MetaballFluidSolver = class MetaballFluidSolverClass extends FluidSolver {

        constructor( gridW, gridH, 
                     maxNumFluidParticles, fluidParticleRadius, fluidParticleGravityX, fluidParticleGravityY, 
                     fixedDt, numSubSteps, 
                     constraints ) {
            super( gridW, gridH, 
                   maxNumFluidParticles, fluidParticleRadius, fluidParticleGravityX, fluidParticleGravityY, 
                   fixedDt, numSubSteps, 
                   constraints );
        }
        
        updateFluid(dt) {

            this.clearSpatialBins();
            
            // insert particle into bin array for faster neighbor search
            for ( let i = 0; i < this.activeFluidParticles; i++ ) {
                let fluidParticle = this.fluidParticles[i];
                
                let binX = Math.floor( fluidParticle.position.x / this.binDim + 0.5 );
                let binY = Math.floor( fluidParticle.position.y / this.binDim + 0.5 );
                
                binX = AppUtils.clamp( binX, 0, this.numBinsX - 1 );
                binY = AppUtils.clamp( binY, 0, this.numBinsY - 1 );

                this.spatialArray[ binY ][ binX ].push( i );
            }
            
            // enforce constraints
            for ( let constraintIdx = 0; constraintIdx < this.constraints.length; constraintIdx++ ) {
                this.constraints[ constraintIdx ].applyConstraint( this.fluidParticles, this.activeFluidParticles );
            }
                        
            // resolve collisions
            for (let i = 0; i < this.activeFluidParticles; i++) {
                let fluidParticleA = this.fluidParticles[i];

                let fluidParticleA_binX = Math.floor( fluidParticleA.position.x / this.binDim + 0.5 );
                let fluidParticleA_binY = Math.floor( fluidParticleA.position.y / this.binDim + 0.5 );
                // let fluidParticleA_binX = Math.floor( fluidParticleA.position.x / binDim );
                // let fluidParticleA_binY = Math.floor( fluidParticleA.position.y / binDim );

                let binY_start = Math.max( fluidParticleA_binY - 1, 0 );
                let binY_end   = Math.min( fluidParticleA_binY + 1, this.numBinsY - 1 );

                let binX_start = Math.max( fluidParticleA_binX - 1, 0 );
                let binX_end   = Math.min( fluidParticleA_binX + 1, this.numBinsX - 1 );
                
                for ( let binY = binY_start; binY <= binY_end; binY++ ) { 
                    for ( let binX = binX_start; binX <= binX_end; binX++ ) { 
                        for ( let ki = 0; ki < this.spatialArray[ binY ][ binX ].length; ki++ ) {
                            
                            let otherFluidParticledx = this.spatialArray[ binY ][ binX ][ ki ];
                            if ( i == otherFluidParticledx ) { continue; }
                            let fluidParticleB = this.fluidParticles[otherFluidParticledx]; 
                                                            
                            let diffX = fluidParticleA.position.x - fluidParticleB.position.x;
                            let diffY = fluidParticleA.position.y - fluidParticleB.position.y;
                            let diffLenSquared = diffX*diffX + diffY*diffY;
                            if (diffLenSquared < this.twofluidParticleRadiusSquared) {
                                let diffLen = Math.sqrt( diffLenSquared );
                                
                                let fixDirX = diffX / diffLen;
                                let fixDirY = diffY / diffLen;
                                
                                //let halfDeltaLen = 0.5 * ( 2.0f * this.fluidParticleRadius - diffLen );
                                let halfDeltaLen = this.fluidParticleRadius - 0.5 * diffLen;
                                
                                fluidParticleA.position.x += fixDirX * halfDeltaLen;
                                fluidParticleA.position.y += fixDirY * halfDeltaLen;
                                
                                fluidParticleB.position.x -= fixDirX * halfDeltaLen;
                                fluidParticleB.position.y -= fixDirY * halfDeltaLen;
                                
                                fluidParticleA.accelX = 0.0;
                                //! fluidParticleA.accelY = 0.0;
                                //! 
                                fluidParticleA.accelY = Math.min( 0.0, fixDirY );
                                
                                fluidParticleB.accelX = 0.0;
                                //! fluidParticleB.accelY = 0.0;
                                //! 
                                fluidParticleB.accelY = Math.min( 0.0, -fixDirY );
                            }
                        }
                    }
                }                        
            }
            
            // apply gravity
            for (let i = 0; i < this.activeFluidParticles; i++) {
                let fluidParticle = this.fluidParticles[ i ];
                // add gravity
                fluidParticle.accelerate( this.fluidParticleGravityX, this.fluidParticleGravityY );
            }
            
            // update positions
            for (let i = 0; i < this.activeFluidParticles; i++) {
                let fluidParticle = this.fluidParticles[i];
                fluidParticle.updatePositionNoAccelReset( dt );
            }                    
        }
        
    };
                         
    
    exports.saveFluidParticleColors = async function saveFluidParticleColorsFn( app, browserEnum, fluidParticles, image ) {
        app.stop();

        //const url = await app.renderer.extract.base64(app.stage);
        let tintArray = new Array();
        for (let i = 0; i < fluidParticles.length; i++) {
            
            let fluidParticle = fluidParticles[i];
            if( isNaN( fluidParticle.position.x ) || isNaN( fluidParticle.position.y ) ) {
                fluidParticle.tint = AppUtils.rgbToHex( 127, 127, 127 );
                tintArray.push( fluidParticle.tint );
                tintArray.push( '\n' );
                continue;
            }
            let x = Math.floor( fluidParticle.position.x * (sceneMapTex.width-1)  / app.screen.width  + 0.5 );
            let y = Math.floor( fluidParticle.position.y * (sceneMapTex.height-1) / app.screen.height + 0.5 );

            x = AppUtils.clamp( x, 0, sceneMapTex.width-1 );
            y = AppUtils.clamp( y, 0, sceneMapTex.height-1 );
            let r = image[ ( sceneMapTex.width * y + x ) * 4 + 0 ];
            let g = image[ ( sceneMapTex.width * y + x ) * 4 + 1 ];
            let b = image[ ( sceneMapTex.width * y + x ) * 4 + 2 ];
            
            if( isNaN( r ) || isNaN( g ) || isNaN( b ) ) {
                r = g = b = 127;
            }                    
            r = AppUtils.clamp( r, 0, 255 );
            g = AppUtils.clamp( g, 0, 255 );
            b = AppUtils.clamp( b, 0, 255 );
            //console.log( "%d %d %d", r, g, b );
            fluidParticle.tint = AppUtils.rgbToHex( r, g, b );
            
            let text = '\"' + fluidParticle.tint + '\"';
            if ( i % 10 == 9) { text += '\n'; }
            // tintArray.push( '\"' );
            // tintArray.push( fluidParticle.tint );
            // tintArray.push( '\"' );
            tintArray.push( text );
            
            if ( !browserEnum.isFirefox ) {
                console.log(text + ',');
            }
            
        }

        // Create element with <a> tag
        const link = document.createElement("a");

        // Create a blog object with the file content which you want to add to the file
        const file = await new Blob([tintArray], { type: 'text/plain' });

        // doesn't work on Chrome...
        if ( browserEnum.isFirefox ) {
            // Add file content in the object URL
            link.href = URL.createObjectURL(file);
            //link.href = URL.createObjectURL(file).replace('http://','https://');
            
            console.log( link.href );

            // Add file name
            link.download = "sample.txt";

            // Add click event to <a> tag to save file.
            link.click();
            URL.revokeObjectURL(link.href);
        }
        
        app.start();
        
        //console.log( [tintArray] );
    };
                
    exports.saveFluidParticleColorsToConsole = function saveFluidParticleColorsToConsoleFn(fluidParticles, image) {
        // workaround for Firefox console.log grouping of identical messages
        let prevR = 0;
        let prevG = 0;
        let prevB = 0;
        for (let i = 0; i < fluidParticles.length; i++) {
            let fluidParticle = fluidParticles[i];
        
            let x = Math.floor( fluidParticle.position.x * (sceneMapTex.width-1)  / app.screen.width  + 0.5 );
            let y = Math.floor( fluidParticle.position.y * (sceneMapTex.height-1) / app.screen.height + 0.5 );
            //console.log( "%f %f", x, y );
            x = AppUtils.clamp( x, 0, sceneMapTex.width-1 );
            y = AppUtils.clamp( y, 0, sceneMapTex.height-1 );
            let r = image[ ( sceneMapTex.width * y + x ) * 4 + 0 ];
            let g = image[ ( sceneMapTex.width * y + x ) * 4 + 1 ];
            let b = image[ ( sceneMapTex.width * y + x ) * 4 + 2 ];
            
            if( isNaN( r ) || isNaN( g ) || isNaN( b ) ) {
                r = g = b = 127;
            }                    
            
            r = AppUtils.clamp( r, 0, 255 );
            g = AppUtils.clamp( g, 0, 255 );
            b = AppUtils.clamp( b, 0, 255 );
            if ( prevR == r && prevG == g && prevB == b ) { // prevent console log grouping in Firefox
                let minRGB = Math.min( Math.min( r, g ), b );
                if ( minRGB == 255 ) {
                    r -= 1;
                } else {
                    if ( r < 255 ) { r += 1; }
                    else if ( g < 255 ) { g += 1; }
                    else if ( b < 255 ) { b += 1; }
                }
            }
            //console.log( "%d %d %d", r, g, b );
            fluidParticle.tint = AppUtils.rgbToHex( r, g, b );

            //console.log( "%f, %f,", fluidParticle.position.x, fluidParticle.position.y );
            console.log( '"%s",', fluidParticle.tint );
            prevR = r;
            prevG = g;
            prevB = b;
        }            
    }    
    
    exports.FluidParticle = FluidParticle;
    exports.FluidSolver = FluidSolver;
    exports.MetaballFluidSolver = MetaballFluidSolver;
    
    return exports;
} )({});
