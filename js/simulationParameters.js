"use strict";

import { Vec2 } from './vec2.js';

export
class SimulationParameters {
    
    static rigidBodyDefaultFriction() { return 0.4; }
    //static rigidBodyDefaultRestitution() { return 0.1; }
    static rigidBodyDefaultRestitution() { return 0.01; }
    static rigidBodyDefaultMass() { return 10.0; }
    
    static globalGravity() { return new Vec2( 0.0, 9.81 * 6.0 ); }
    static globalLinearFriction() { return ( 1.0 - 0.9875 ); }
    static globalAngularFriction() { return ( 1.0 - 0.975 ); }
    static globalMaxPenetrationRelaxationIterations() { return 20.0; }
    static globalPerformPenetrationRelaxation() { return true; }
}