"use strict";

// import * as PIXI from './pixijs/pixi.js';

var SoftBodySolver = (function (exports) {

    function vectorFromTo( posA, posB ) {
        return { x: posB.x - posA.x, y: posB.y - posA.y };
    }
    
    function distance( posA, posB ) {
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
        constructor(mass, texture) {
            super(texture);
            //super(Texture.fromImage(texture_url));
            this.speed = 0.0;
            this.vel = { x: 0.0, y: 0.0 };
            this.force = { x: 0.0, y: 0.0 };
            this.recip_mass = 1.0 / mass;
            this.lastPosX = this.position.x;
            this.lastPosY = this.position.y;
        }
        
        update( dt ) {

            // Euler integration
            {
                this.lastPosX = this.position.x;
                this.lastPosY = this.position.y;
                    
                // accumulate velocity
                this.vel.x += this.force.x * dt * this.recip_mass;
                this.vel.y += this.force.y * dt * this.recip_mass;

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

        setForce( force ) {
            this.force.x = force.x;
            this.force.y = force.y;
        }
        
    };
    
    let Spring = class SpringClass {
        constructor( objA, objB /*, stiffness, dampingFactor*/ ) {
            this.objA = objA;
            this.objB = objB;

            //stiffness;
            //this.kS = 220.0;
            //this.kS = 350.0;
            //this.kS = 420.0;
            this.kS = 480.0;
            //this.kS = 520.0;
            //this.kS = 820.0;

            //dampingFactor;
            //this.kD = 0.4; 
            this.kD = 5.8; // TODO: [ph] while tweaking... is it okay to not be within [0;1] ...?
            //this.kD = 4.8;
            
            this.restLen = distance( this.objA.position, this.objB.position );
        }
        
        calculateSpringForce() {
            let currLen = distance( this.objA.position, this.objB.position );
            return this.kS * (currLen - this.restLen)
        }
        
        calculateDampingForce( vecAB_unit ) {
            //let velDiff = vectorFromTo( this.massA.vel, this.massB.vel );
            let velDiff = { x: this.objB.vel.x - this.objA.vel.x, y: this.objB.vel.y - this.objA.vel.y };
            
            let dotProd = dot( vecAB_unit, velDiff );
            return dotProd * this.kD;
        }
        
        update() {
            let vecAB = vectorFromTo( this.objA.position, this.objB.position );
            let vecAB_unit = vecAB;
            normalize( vecAB_unit );

            let fS = this.calculateSpringForce();
            let fD = this.calculateDampingForce( vecAB_unit );
            
            let fT = fS + fD;
            
            let forceMassA = { x:  fT * vecAB_unit.x, y:  fT * vecAB_unit.y };
            this.objA.addForce( forceMassA );
            
            let forceMassB = { x: -fT * vecAB_unit.x, y: -fT * vecAB_unit.y };
            this.objB.addForce( forceMassB );
        }
    };
    
    
    let SpringMassSolverConstraintBase = class SpringMassSolverConstraintBaseClass {   
    };
    
    let SpringMassSolverConstraintCircle = class SpringMassSolverConstraintCircleClass extends SpringMassSolverConstraintBase {
        constructor( circleCenterX, circleCenterY, circleRadius, particleRadius ) {
            super();

            // boundary condition
            this.particleRadius = particleRadius;
            
            this.circleBoundCenterX = circleCenterX;
            this.circleBoundCenterY = circleCenterY; //0.38;
            this.circleBoundRadius = circleRadius;
            //this.circleBoundRadius = Math.min( newGridW, newGridH ) * 0.375;
            this.circleBoundRadiusSquared = this.circleBoundRadius * this.circleBoundRadius;
            this.testDistSquared = this.circleBoundRadiusSquared - 2.0 * this.circleBoundRadius * this.particleRadius + this.particleRadius*this.particleRadius;

            //console.log( "SpringMassSolverConstraintCircle ctor" );
        }
        
            
        // onResolutionChanged( newGridW, newGridH ) {
        //     this.commonInit( newGridW, newGridH );
        // }

        //applyConstraint( particles, numActiveParticles ) {
        applyConstraint( particles ) {
            //console.log( "here" );
            
            // enforce constraints / boundary conditions
            //for (let i = 0; i < numActiveParticles; i++) {
            for (let i = 0; i < particles.length; i++) {
                let particle = particles[i];
                let toObjX = particle.position.x - this.circleBoundCenterX;
                let toObjY = particle.position.y - this.circleBoundCenterY;
                let distSquared = toObjX*toObjX + toObjY*toObjY;
                
                
                
                if ( distSquared > this.testDistSquared ) {
                    let dist = Math.sqrt( distSquared );
                    let fixDirX = toObjX / dist;
                    let fixDirY = toObjY / dist;

                    let boolean_val = false;
                    if ( boolean_val ) { // don't bounce back, more viscous fluid-like
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
                        
                        particle.position.x = this.circleBoundCenterX + fixDirX * ( this.circleBoundRadius - this.particleRadius * 1.035 );
                        particle.position.y = this.circleBoundCenterY + fixDirY * ( this.circleBoundRadius - this.particleRadius * 1.035 );

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
    
    let SpringMassSolverConstraintPlane = class SpringMassSolverConstraintPlaneClass extends SpringMassSolverConstraintBase {
        constructor( particle_radius, plane_N ) {
            super();

            // boundary condition
            this.particle_radius = particle_radius;
            this.plane_N = plane_N;
    
            console.log( "SpringMassSolverConstraintPlane ctor" );
        }
        
        applyConstraint( particles ) {
            
            // enforce constraints / boundary conditions
            for (let i = 0; i < particles.length; i++) {
                let particle = particles[i];
                
                const dist_val = ( particle.position.x * this.plane_N.x + particle.position.y * this.plane_N.y + this.plane_N.z ) - this.particle_radius;
                if ( dist_val < 0.0 ) { // did collide
                    let velX = particle.vel.x; //particle.position.x - particle.lastPosX;
                    let velY = particle.vel.y; //particle.position.y - particle.lastPosY;
                    
                    let velDotN = velX * this.plane_N.x + velY * this.plane_N.y;
                    let reflX = velX - 2.0 * velDotN * this.plane_N.x;
                    let reflY = velY - 2.0 * velDotN * this.plane_N.y;                
                    
                    const elasticity = 0.975;
                    particle.position.x += -dist_val * reflX * elasticity;
                    particle.position.y += -dist_val * reflY * elasticity;

                    
                    //const elasticity = 0.999;
                    particle.vel.x = 0.0; //reflX * 0.1;
                    particle.vel.y = 0.0; //reflY * 0.1;

                    
                    particle.force.x = 0.0;
                    particle.force.y = 0.0;

                }
            }
            
        }                 
    };
    exports.SpringMassSolverConstraintPlane = SpringMassSolverConstraintPlane;
        
    
    let SoftBodySolver = class SoftBodySolverClass {

        constructor( //gridW, gridH, 
                     //maxNumParticles, 
                     //particleRadius, 
                     //particleGravityX, particleGravityY, 
                     //fixedDt, 
                     //numSubSteps, 
                     //constraints 
                     ) {
            
            this.particles = [];
            //this.maxNumParticles = maxNumParticles;
            //this.numActiveParticles = 0;
            //this.particleRadius = particleRadius;
            //this.binDim = 2.0 * particleRadius;
            
            this.particleRadius = 1.0;
            
            this.springLinks = [];

            // this.particleGravityX = particleGravityX;
            // this.particleGravityY = particleGravityY;
            // this.particleGravityX = SimulationParameters.globalGravity().x;
            // this.particleGravityY = SimulationParameters.globalGravity().y;
            this.particleGravityX = 0.0;
            this.particleGravityY = 1200.0;

            // this.fixedDt = fixedDt;
            // this.numSubSteps = numSubSteps;
            // this.subFixedDt = fixedDt / numSubSteps;
                        
            //this.constraints = constraints;
            this.constraints = [];
            
            // this.commonInit( gridW, gridH );                         
        }
        
        getParticles() { 
            return this.particles; 
        }
        
        getParticleAtIdx( idx ) { 
            return this.particles[idx]; 
        }

        addParticle( particle ) { 
            //this.numActiveParticles++;
            this.particles.push( particle ); 
        }
        // removeParticle( particleIdx ) { 
        //     //this.numActiveParticles--;
        //     //this.particles.splice( particleIdx, particleIdx ); // attention, also remove link if there was one!
        //     this.particles.splice( particleIdx, 1 ); // attention, also remove link if there was one!
        // }

        addLink( particleAIdx, particleBIdx ) {
            let idxPair = [ particleAIdx, particleBIdx ].sort();
            
            let massA = this.particles[ idxPair[ 0 ] ];
            let massB = this.particles[ idxPair[ 1 ] ];
            this.springLinks.push( new Spring( massA, massB/*, kS, kD*/ ) );
        }
        // removeLink( particleAIdx, particleBIdx ) {
        //     const idx = this.springLinks.indexOf( [ particleAIdx, particleBIdx ].sort() );
        //     if ( idx >= 0 ) {
        //         this.springLinks.splice( idx, idx );
        //     }
        // }
        removeAllSpringLinks() {
            this.springLinks = [];
        }
        
        // setActiveParticleCount( activeParticleCount ) {
        //     this.numActiveParticles = activeParticleCount;
        // }
        
        getMaxNumParticles() { 
            return this.particles.length; 
        }
        
        addBoundaryConstraint( constraint ) {
            this.constraints.push( constraint );
        }
        
        // commonInit(gridW, gridH) {
        //     this.gridW = gridW;
        //     this.gridH = gridH;
        //     this.numBinsX = Math.floor( ( gridW + ( this.binDim - 1 ) ) / this.binDim ); // round up
        //     this.numBinsY = Math.floor( ( gridH + ( this.binDim - 1 ) ) / this.binDim ); // round up
            
        //     this.spatialArray = this.createSpatialBins();
        // }
        
        // onResolutionChanged( newGridW, newGridH ) {
        //     this.commonInit( newGridW, newGridH );
        //     this.createSpatialBins();
            
        //     for ( let constraintIdx = 0; constraintIdx < this.constraints.length; constraintIdx++ ) {
        //         this.constraints[constraintIdx].onResolutionChanged( newGridW, newGridH );
        //     }
        // }
        
        // createSpatialBins() { 
        //     console.log( 'created spatial bins' );
        //     this.spatialArray = new Array( this.numBinsY );
        //     console.log( 'numBinsX = %d, numBinsY = %d', this.numBinsX, this.numBinsY );
        //     //console.log( 'spatialArray.length %d, numBinsY = %d', this.spatialArray.length, this.numBinsY );
        //     for (let y = 0; y < this.numBinsY; y++) {
        //         this.spatialArray[y] = new Array( this.numBinsX );
        //         //console.log( '\tspatialArray[y].length %d, this.numBinsX = %d', this.spatialArray[y].length, this.numBinsX );
        //         for ( let x = 0; x < this.numBinsX; x++ ) {
        //             this.spatialArray[y][x] = [];
        //             //console.log( '\tspatialArray[%d][%d].length = %d', y, x, spatialArray[y][x].length );
        //         }
        //     }
        //     //return [numBinsX, numBinsY];
        // }

        // clearSpatialBins() {            
        //     //console.log( 'cleared spatial bins' );
        //     for (let y = 0; y < this.numBinsY; y++) {
        //         for ( let x = 0; x < this.numBinsX; x++ ) {
        //             this.spatialArray[y][x] = [];
        //         }
        //     }
        // }

        updateDriver( dt, num_sub_steps ) {
            // if ( this.numSubSteps > 0 ) {
            //     for ( let step = 0; step < this.numSubSteps; step++ ) {
            //         this.updateSpringMassSystem( this.subFixedDt );
            //     }
            // } else {
            //     this.updateSpringMassSystem( this.fixedDt );
            // }
            
            
            if ( num_sub_steps > 0 ) {
                const dt_step = dt / num_sub_steps;
                for ( let step = 0; step < num_sub_steps; step++ ) {
                    this.updateSpringMassSystem( dt_step );
                }
            } else {
                this.updateSpringMassSystem( dt );
            }
            
        }
        
        updateSpringMassSystem( dt ) {
            // apply gravity
            //for (let i = 0; i < this.numActiveParticles; i++) {
            for (let i = 0; i < this.particles.length; i++) {
                let particle = this.particles[ i ];
                // add gravity
                
                //particle.addForce( { x: 0.0, y: 200.0 * particle.mass }  );
                particle.addForce( { x: 0.0, y: 200.0 / particle.recip_mass }  );
            }
            
            for ( const smLink of this.springLinks ) {
                smLink.update( dt );
            }    

            // enforce constraints
            for ( let constraintIdx = 0; constraintIdx < this.constraints.length; constraintIdx++ ) {
                //console.log( "here 1" );
                //this.constraints[ constraintIdx ].applyConstraint( this.particles, this.numActiveParticles );
                this.constraints[ constraintIdx ].applyConstraint( this.particles, this.particles.length, dt );
            }
            
            // update positions
            //for (let i = 0; i < this.numActiveParticles; i++) {
            for (let i = 0; i < this.particles.length; i++) {
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
