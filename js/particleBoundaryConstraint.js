
class ParticleBoundaryConstraintBase {   
};

class ParticleBoundaryConstraintCircle extends ParticleBoundaryConstraintBase {
    constructor( circleCenterX, circleCenterY, circleRadius, fluidParticleRadius ) {
        super();

        this.fluidParticleRadius = fluidParticleRadius;
        // boundary condition
        
        this.circleBoundCenterX = circleCenterX; //newGridW * 0.5;
        this.circleBoundCenterY = circleCenterY; //newGridH * 0.5; //0.38;
        this.circleBoundRadius = circleRadius; //Math.min( newGridW, newGridH ) * 0.46;
        //this.circleBoundRadius = Math.min( newGridW, newGridH ) * 0.5;
        this.circleBoundRadiusSquared = this.circleBoundRadius * this.circleBoundRadius;
        
        //this.testDistSquared = this.circleBoundRadiusSquared - 2.0 * this.circleBoundRadius * this.fluidParticleRadius - this.fluidParticleRadius*this.fluidParticleRadius;
        // this should be correct:
        this.testDistSquared = this.circleBoundRadiusSquared - 2.0 * this.circleBoundRadius * this.fluidParticleRadius + this.fluidParticleRadius*this.fluidParticleRadius;
    }
        
    applyConstraint( fluidParticles, activeFluidParticles, dt ) {
        //console.error( `in applyConstraints()!` );
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
                                    
                // fluidParticle.accelX = 0.0;                    
                // fluidParticle.accelY = 0.0;
            }
        }
    }                 
}


class ParticleBoundaryConstraintPlane extends ParticleBoundaryConstraintBase {
    constructor( fluidParticleRadius, plane_N ) {
        super();

        this.fluidParticleRadius = fluidParticleRadius;
        this.plane_N = plane_N;
    }
        
    applyConstraint( fluidParticles, activeFluidParticles, dt ) {
        //console.error( `in applyConstraints()!` );
        // enforce constraints / boundary conditions
        for (let i = 0; i < activeFluidParticles; i++) {
            let fluidParticle = fluidParticles[i];
            
            const dist_val = ( fluidParticle.position.x * this.plane_N.x + fluidParticle.position.y * this.plane_N.y + this.plane_N.z ) - this.fluidParticleRadius;
            if ( dist_val < 0.0 ) { // did collide
                let velX = fluidParticle.position.x - fluidParticle.lastPosX;
                let velY = fluidParticle.position.y - fluidParticle.lastPosY;
                
                let velDotN = velX * this.plane_N.x + velY * this.plane_N.y;
                let reflX = velX - 2.0 * velDotN * this.plane_N.x;
                let reflY = velY - 2.0 * velDotN * this.plane_N.y;                
                
                fluidParticle.lastPosX = fluidParticle.position.x;
                fluidParticle.lastPosY = fluidParticle.position.y;
                
                fluidParticle.position.x += reflX;
                fluidParticle.position.y += reflY;

            }
        }
    }                 
}
