var SoftBodySolver = (function (exports) {

    function vectorFromTo( posA, posB ) {
        return { x: posB.x - posA.x, y: posB.y - posA.y };
    }
    
    function distance( posA, posB ) {
        // let diffX = posA.x - posB.x;
        // let diffY = posA.y - posB.y;
        let dVec = vectorFromTo( posA, posB );
        return length( dVec );
    }
    
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
    
    let MassPoint = class MassPointClass extends PIXI.Sprite {
        constructor(texture) {
            super(texture);
            this.speed = 0.0;
            this.vel = { x: 0.0, y: 0.0 };
            this.force = { x: 0.0, y: 0.0 };
            //this.mass = 1000.0;
            this.mass = 1.0;
        }
        
        update( dt ) {

            // Euler integration
            {
                // accumulate velocity
                this.vel.x += this.force.x * dt / this.mass;
                this.vel.y += this.force.y * dt / this.mass;

                // accumulate position
                this.position.x += this.vel.x * dt;
                this.position.y += this.vel.y * dt;
            }
            
            // all forces have been applied, re-set to 0 before starting next frame
            this.force.x = 0.0;
            this.force.y = 0.0;
        }
        
        addForce( force ) {
            this.force.x += force.x;
            this.force.y += force.y;
        }
    };
    
    let Spring = class SpringClass {
        constructor( massA, massB /*, stiffness, dampingFactor*/ ) {
            this.massA = massA;
            this.massB = massB;

            //this.kS = 80.0;
            //this.kS = 180.0; //stiffness;
            
            //stiffness;
            this.kS = 220.0;
            //this.kS = 1000.0; 
            // this.kS = 10000.0; 

            //dampingFactor;
            this.kD = 0.4; 
            //this.kD = 10.0; 
            // this.kD = 20.0;
            
            //this.kD = 1.2; //dampingFactor;
            //this.kD = 4.0; //dampingFactor;
            
            this.restLen = distance( this.massA.position, this.massB.position );
            //this.kD = 0.2; //dampingFactor;
            
        }
        
        calculateSpringForce() {
            let currLen = distance( this.massA.position, this.massB.position );
            return this.kS * (currLen - this.restLen)
        }
        
        calculateDampingForce( vecAB_unit ) {
            //let velDiff = vectorFromTo( this.massA.vel, this.massB.vel );
            let velDiff = { x: this.massB.vel.x - this.massA.vel.x, y: this.massB.vel.y - this.massA.vel.y };
            
            let dotProd = dot( vecAB_unit, velDiff );
            return dotProd * this.kD;
        }
        
        update() {
            let vecAB = vectorFromTo( this.massA, this.massB );
            let vecAB_unit = vecAB;
            normalize( vecAB_unit );

            let fS = this.calculateSpringForce();
            let fD = this.calculateDampingForce( vecAB_unit );
            
            let fT = fS + fD;
            
            let forceMassA = { x:  fT * vecAB_unit.x, y:  fT * vecAB_unit.y };
            this.massA.addForce( forceMassA );
            
            let forceMassB = { x: -fT * vecAB_unit.x, y: -fT * vecAB_unit.y };
            this.massB.addForce( forceMassB );
        }
    };
    
    
    let SpringMassSolverConstraintBase = class SpringMassSolverConstraintBaseClass {   
    };
    
    let SpringMassSolverConstraintCircle = class SpringMassSolverConstraintCircleClass extends SpringMassSolverConstraintBase {
        constructor( gridW, gridH, particleRadius ) {
            super();

            // boundary condition
            this.particleRadius = particleRadius;
            this.commonInit( gridW, gridH );
            console.log( "SpringMassSolverConstraintCircle ctor" );
        }
        
        commonInit( newGridW, newGridH ) {
            this.circleBoundCenterX = newGridW * 0.5;
            this.circleBoundCenterY = newGridH * 0.5; //0.38;
            this.circleBoundRadius = Math.min( newGridW, newGridH ) * 0.46; //0.5;
            //this.circleBoundRadius = Math.min( newGridW, newGridH ) * 0.375;
            this.circleBoundRadiusSquared = this.circleBoundRadius * this.circleBoundRadius;
            this.testDistSquared = this.circleBoundRadiusSquared - 2.0 * this.circleBoundRadius * this.particleRadius + this.particleRadius*this.particleRadius;
        }
            
        onResolutionChanged( newGridW, newGridH ) {
            this.commonInit( newGridW, newGridH );
        }

        applyConstraint( particles, numActiveParticles ) {
            //console.log( "here" );
            
            // enforce constraints / boundary conditions
            for (let i = 0; i < numActiveParticles; i++) {
                let particle = particles[i];
                let toObjX = particle.position.x - this.circleBoundCenterX;
                let toObjY = particle.position.y - this.circleBoundCenterY;
                let distSquared = toObjX*toObjX + toObjY*toObjY;
                
                
                
                if ( distSquared > this.testDistSquared ) {
                    let dist = Math.sqrt( distSquared );
                    let fixDirX = toObjX / dist;
                    let fixDirY = toObjY / dist;

                    // particle.position.x = this.circleBoundCenterX + fixDirX * ( this.circleBoundRadius - this.particleRadius*1.025 );
                    // particle.position.y = this.circleBoundCenterY + fixDirY * ( this.circleBoundRadius - this.particleRadius*1.025 );
                    
                    // // actually reflect!!!
                    // let N = { x: -fixDirX, y: -fixDirY };
                    // normalize( N );
                    // let reflVel = reflect( vel, N );
                    // particle.vel.x = reflVec.x;
                    // particle.vel.y = reflVec.y;

                    // let normalX = particle.position.x - this.circleBoundCenterX;
                    // let normalY = particle.position.y - this.circleBoundCenterY;
                    
                    // let normalLen = Math.sqrt( normalX * normalX + normalY * normalY );
                    // normalX /= normalLen;
                    // normalY /= normalLen;
                    
                    // let velX = particle.position.x - particle.lastPosX;
                    // let velY = particle.position.y - particle.lastPosY;
                    
                    // let velDotN = velX * normalX + velY * normalY;
                    // let reflX = velX - 2.0 * velDotN * normalX;
                    // let reflY = velY - 2.0 * velDotN * normalY;

                    // // pos insdie constraint region
                    // particle.lastPosX = this.circleBoundCenterX + fixDirX * ( this.circleBoundRadius - this.particleRadius );
                    // particle.lastPosY = this.circleBoundCenterY + fixDirY * ( this.circleBoundRadius - this.particleRadius );

                    // particle.position.x = particle.lastPosX + reflX * 0.66;
                    // particle.position.y = particle.lastPosY + reflY * 0.66;

                    // particle.velX = reflX;
                    // particle.velY = reflY;


                    if ( false ) { // don't bounce back, more viscous fluid-like
                        //console.log( "constraint resolve!" );
                        particle.position.x = this.circleBoundCenterX + fixDirX * ( this.circleBoundRadius - this.particleRadius*1.05 );
                        particle.position.y = this.circleBoundCenterY + fixDirY * ( this.circleBoundRadius - this.particleRadius*1.05 );

                        particle.vel.x = 0.0;
                        particle.vel.y = 0.0;
                        
                        particle.force.x = 0.0;
                        particle.force.y = 0.0;

                    } else { // bounce off elastically
                        let normalX = particle.position.x - this.circleBoundCenterX;
                        let normalY = particle.position.y - this.circleBoundCenterY;
                        
                        let normalLen = Math.sqrt( normalX * normalX + normalY * normalY );
                        normalX /= normalLen;
                        normalY /= normalLen;
                        
                        let velX = particle.vel.x;
                        let velY = particle.vel.y;
                        
                        let velDotN = velX * normalX + velY * normalY;
                        let reflX = velX - 2.0 * velDotN * normalX;
                        let reflY = velY - 2.0 * velDotN * normalY;

                        // particle.lastPosX = this.circleBoundCenterX + fixDirX * ( this.circleBoundRadius - this.particleRadius * 1.035 );
                        // particle.lastPosY = this.circleBoundCenterY + fixDirY * ( this.circleBoundRadius - this.particleRadius * 1.035 );
                        // particle.position.x = particle.lastPosX + reflX * 0.66;
                        // particle.position.y = particle.lastPosY + reflY * 0.66;
                        
                        particle.position.x = this.circleBoundCenterX + fixDirX * ( this.circleBoundRadius - this.particleRadius * 1.035 );
                        particle.position.y = this.circleBoundCenterY + fixDirY * ( this.circleBoundRadius - this.particleRadius * 1.035 );
                        // particle.position.x += reflX * 0.66;
                        // particle.position.y += reflY * 0.66;

                        //const elasticity = 0.9;
                        const elasticity = 0.975;
                        particle.vel.x = reflX * elasticity;
                        particle.vel.y = reflY * elasticity;
                        
                        particle.force.x = 0.0;
                        particle.force.y = 0.0;
                    }

                }
            }
        }                 
    };
    exports.SpringMassSolverConstraintCircle = SpringMassSolverConstraintCircle;
    
    let SoftBodySolver = class SoftBodySolverClass {

        constructor( gridW, gridH, 
                     maxNumParticles, particleRadius, particleGravityX, particleGravityY, 
                     //massPositions, springLinks, 
                     fixedDt, numSubSteps, 
                     constraints ) {
            
            this.particles = [];
            this.maxNumParticles = maxNumParticles;
            this.numActiveParticles = 0;
            this.particleRadius = particleRadius;
            this.binDim = 2.0 * particleRadius;
            
            // this.massPositions = massPositions;
            this.springLinks = [];
            // this.shapeSpringLinks = [];
            //this.springRestLens = new Map();
            
            this.particleGravityX = particleGravityX;
            this.particleGravityY = particleGravityY;

            this.fixedDt = fixedDt;
            this.numSubSteps = numSubSteps;
            this.subFixedDt = fixedDt / numSubSteps;
                        
            this.constraints = constraints;
            
            let twoParticleRadius = 2.0 * particleRadius;
            this.twoParticleRadiusSquared = twoParticleRadius * twoParticleRadius;
                        
            this.commonInit( gridW, gridH );                         
        }
        
        getParticles() { 
            return this.particles; 
        }
        
        getParticleAtIdx( idx ) { 
            return this.particles[idx]; 
        }

        addParticle( particle ) { 
            this.numActiveParticles++;
            this.particles.push( particle ); 
        }
        removeParticle( particleIdx ) { 
            this.numActiveParticles--;
            this.particles.splice( particleIdx, particleIdx ); // attention, also remove link if there was one!
        }

        addLink( particleAIdx, particleBIdx ) {
            let idxPair = [ particleAIdx, particleBIdx ].sort();
            // let massAPos = this.particles[ idxPair[ 0 ] ].position;
            // let massBPos = this.particles[ idxPair[ 1 ] ].position;
            // let diffX = massAPos.x - massBPos.x;
            // let diffY = massAPos.y - massBPos.y;
            // let restLen = Math.sqrt( diffX*diffX + diffY*diffY );
            
            let massA = this.particles[ idxPair[ 0 ] ];
            let massB = this.particles[ idxPair[ 1 ] ];
            // let kS = 10.0;
            // let kD = 1.0;
            this.springLinks.push( new Spring( massA, massB/*, kS, kD*/ ) );
            //this.springRestLens.set( idxPair, restLen );
        }
        // removeLink( particleAIdx, particleBIdx ) {
        //     const idx = this.springLinks.indexOf( [ particleAIdx, particleBIdx ].sort() );
        //     if ( idx >= 0 ) {
        //         this.springLinks.splice( idx, idx );
        //     }
        // }
        
        setActiveParticleCount( activeParticleCount ) {
            this.numActiveParticles = activeParticleCount;
        }
        
        getMaxNumParticles() { 
            return this.maxNumParticles; 
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
                    this.spatialArray[y][x] = [];
                    //console.log( '\tspatialArray[%d][%d].length = %d', y, x, spatialArray[y][x].length );
                }
            }
            //return [numBinsX, numBinsY];
        }

        clearSpatialBins() {            
            //console.log( 'cleared spatial bins' );
            for (let y = 0; y < this.numBinsY; y++) {
                for ( let x = 0; x < this.numBinsX; x++ ) {
                    this.spatialArray[y][x] = [];
                }
            }
        }

        updateDriver() {
            if ( this.numSubSteps > 0 ) {
                for ( let step = 0; step < this.numSubSteps; step++ ) {
                    this.updateSpringMassSystem( this.subFixedDt );
                }
            } else {
                this.updateSpringMassSystem( this.fixedDt );
            }
        }
        
        
        updateSpringMassSystem( dt ) {
            // apply gravity
            for (let i = 0; i < this.numActiveParticles; i++) {
                let particle = this.particles[ i ];
                // add gravity
                
                particle.addForce( { x: 0.0, y: 200.0 * particle.mass }  );
                //particle.addForce( { x: 0.0, y: 300.0 * particle.mass }  );
                //particle.addForce( { x: 0.0, y: 400.0 * particle.mass }  );
                //particle.addForce( { x: 0.0, y: 600.0 * particle.mass }  );
                
                //particle.addForce( { x: 0.0, y: 10.0 * particle.mass }  );
            }

            
            for ( const smLink of this.springLinks ) {
                smLink.update( dt );
            }    

            // enforce constraints
            for ( let constraintIdx = 0; constraintIdx < this.constraints.length; constraintIdx++ ) {
                //console.log( "here 1" );
                this.constraints[ constraintIdx ].applyConstraint( this.particles, this.numActiveParticles );
            }
            
            // update positions
            for (let i = 0; i < this.numActiveParticles; i++) {
                let particle = this.particles[i];
                particle.update( dt );
            }                    
            
            // update shape spring
        }
        
        
    
    };
    
    
    exports.MassPoint = MassPoint;
    exports.Spring = Spring;
    exports.SoftBodySolver = SoftBodySolver;
    
    return exports;
} )({});
