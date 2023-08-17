"use strict";

class SimulationParameters {
    
    static globalGravity() { return new Vec2( 0.0, 9.81 * 5.0 ); }
    static globalLinearFriction() { return ( 1.0 - 0.9875 ); }
    static globalAngularFriction() { return ( 1.0 - 0.98 ); }
    static globalMaxPenetrationRelaxationIterations() { return 20.0; }
    static globalPerformPenetrationRelaxation() { return true; }
}