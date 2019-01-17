class Car extends AbstractAgent{
    constructor(id, road, pos, lane){

        let length = MEAN_CAR_LENGTH;
        let width = MEAN_CAR_WIDTH;

        super(id, 'car', length, width, road, pos, lane);


    }
}

class Bus extends AbstractAgent{
    constructor(id, road, pos, lane){

        let length = MEAN_BUS_LENGTH;
        let width = MEAN_BUS_WIDTH;

        super(id, 'bus', length, width, road, pos, lane);
    }
}

class Truck extends AbstractAgent{
    constructor(id, road, pos, lane){

        let length = MEAN_TRUCK_LENGTH;
        let width = MEAN_TRUCK_WIDTH;

        super(id, 'truck', length, width, road, pos, lane);
    }
}

class Jeep extends AbstractAgent{
    constructor(id, road, pos, lane){

        let length = MEAN_JEEP_LENGTH;
        let width = MEAN_JEEP_WIDTH;

        super(id, 'jeep', length, width, road, pos, lane);
    }
}

class Motorcycle extends AbstractAgent{
    constructor(id, road, pos, lane){

        let length = MEAN_MOTORCYCLE_LENGTH;
        let width = MEAN_MOTORCYCLE_WIDTH;

        super(id, 'motorcycle', length, width, road, pos, lane);
    }
}

class Tricycle extends AbstractAgent{
    constructor(id, road, pos, lane){

        let length = MEAN_TRICYCLE_LENGTH;
        let width = MEAN_TRICYCLE_WIDTH;

        super(id, 'tricycle', length, width, road, pos, lane);
    }
}