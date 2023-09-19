"use strict";

//import { Vec2 } from './vec2.js';

//export
class SimulationParameters {
    
    //static rigidBodyDefaultFriction() { return 0.4; }
    static rigidBodyDefaultFriction() { return 0.75; }
    //static rigidBodyDefaultRestitution() { return 0.01; }
    static rigidBodyDefaultRestitution() { return 0.05; }
    //static rigidBodyDefaultRestitution() { return 0.025; }
    static rigidBodyDefaultMass() { return 10.0; }
    
    //static globalGravity() { return new Vec2( 0.0, 9.81 * 6.0 ); }
    static globalGravity() { return new Vec2( 0.0, 9.81 * 13.0 ); }
    
    //static globalLinearFriction() { return ( 1.0 - 0.9875 ); } // = 0.0125
    static globalLinearFriction() { return 0.005; }
    //static globalAngularFriction() { return ( 1.0 - 0.975 ); } // = 0.025
    static globalAngularFriction() { return 0.03; }
    static globalMaxPenetrationRelaxationIterations() { return 20.0; }
    static globalPerformPenetrationRelaxation() { return true; }
}