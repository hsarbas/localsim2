import random

from base import AbstractAgent
import movement_models
import const
from numpy import random as nprand


class Car(AbstractAgent):
    MEAN_CAR_WIDTH = 1.83  # See Eng. A. Carigma's report
    MEAN_CAR_LENGTH = 4.81  # See Eng. A. Carigma's report
    STD_CAR_LENGTH = 0.1862  # See Eng. A. Carigma's report

    def __init__(self, vel, acc, route_list, dstn):
        width = Car.MEAN_CAR_WIDTH
        length = Car.MEAN_CAR_LENGTH
        safe_gap = round(max(0.5, const.MIN_GAP_V0 + nprand.normal(0.0, Car.STD_CAR_LENGTH)), 2)
        # vel_max = round(max(11.11, nprand.normal(13.89, 3.0)), 2)
        vel_max = round(max(const.VEL_DES, nprand.normal(13.89, 3.0)), 2)
        super(Car, self).__init__('car', width, length, vel, acc, route_list, dstn, vel_max=vel_max, safe_gap=safe_gap,
                                  left_bias=const.DLC_LEFT_BIAS)

    def react_to_bus_terminal(self, label, entrydist, exitdist, mean, std_dev, acc_t):
        return const.LARGE_NUMBER


class Bus(AbstractAgent):
    MEAN_BUS_WIDTH = 2.5  # See Eng. A. Carigma's report
    MEAN_BUS_LENGTH = 11.6  # See Eng. A. Carigma's report
    STD_BUS_LENGTH = 0.1668  # See Eng. A. Carigma's report

    def __init__(self, vel, acc, route_list, dstn):
        width = Bus.MEAN_BUS_WIDTH
        length = Bus.MEAN_BUS_LENGTH
        safe_gap = round(max(0.5, const.MIN_GAP_V0 + nprand.normal(0.0, Bus.STD_BUS_LENGTH)), 2)
        # vel_max = round(max(11.11, nprand.normal(16.67, 3.0)), 2)
        vel_max = round(max(const.VEL_DES, nprand.normal(13.89, 3.0)), 2)
        super(Bus, self).__init__('bus', width, length, vel, acc, route_list, dstn, vel_max=vel_max, safe_gap=safe_gap,
                                  right_bias=const.DLC_RIGHT_BIAS)
        self.dwell_time = None

    def react_to_bus_terminal(self, label, entrydist, exitdist, mean, std_dev, acc_t):
        is_front = exitdist <= self.neighborhood['gap_front']

        if entrydist == 0 and self.dwell_time is None:
            self.dwell_time = nprand.lognormal(mean, std_dev)

        elif exitdist < 0.5:
            self.dwell_time = None

        if entrydist == 0 and (is_front or self.vel < const.ALMOST_STOP):
            self.remember(label, self.dwell_time)

        if not self.remembers(label) or self.valid(label):
            acc_t = movement_models.car_following(self.vel, self.vel_max, self.acc_max, self.dec_max,
                                                  0.0, exitdist, safe_gap=self.safe_gap,
                                                  safe_time_headway=self.safe_time_headway)

        return acc_t


class Jeep(AbstractAgent):
    MEAN_JEEP_WIDTH = 1.72  # See Eng. A. Carigma's report
    MEAN_JEEP_LENGTH = 5.9  # See Eng. A. Carigma's report
    STD_JEEP_LENGTH = 0.1668  # See Eng. A. Carigma's report

    def __init__(self, vel, acc, route_list, dstn):
        width = Jeep.MEAN_JEEP_WIDTH
        length = Jeep.MEAN_JEEP_LENGTH
        safe_gap = round(max(0.5, const.MIN_GAP_V0 + nprand.normal(0.0, Jeep.STD_JEEP_LENGTH)), 2)
        # vel_max = round(max(11.11, nprand.normal(16.67, 3.0)), 2)
        vel_max = round(max(const.VEL_DES, nprand.normal(13.89, 3.0)), 2)
        super(Jeep, self).__init__('jeep', width, length, vel, acc, route_list, dstn, vel_max=vel_max, safe_gap=safe_gap,
                                  right_bias=const.DLC_RIGHT_BIAS)
        self.dwell_time = None

    def react_to_bus_terminal(self, label, entrydist, exitdist, mean, std_dev, acc_t):
        is_front = exitdist <= self.neighborhood['gap_front']

        if entrydist == 0 and self.dwell_time is None:
            self.dwell_time = nprand.lognormal(mean, std_dev)

        elif exitdist < 0.5:
            self.dwell_time = None

        if entrydist == 0 and (is_front or self.vel < const.ALMOST_STOP):
            self.remember(label, self.dwell_time)

        if not self.remembers(label) or self.valid(label):
            acc_t = movement_models.car_following(self.vel, self.vel_max, self.acc_max, self.dec_max,
                                                  0.0, exitdist, safe_gap=self.safe_gap,
                                                  safe_time_headway=self.safe_time_headway)

        return acc_t


class Motorcycle(AbstractAgent):
    MEAN_MOTORCYCLE_WIDTH = 0.675
    MEAN_MOTORCYCLE_LENGTH = 1.82
    STD_MOTORCYCLE_LENGTH = 0.1862

    def __init__(self, vel, acc, route_list, dstn):
        width = Motorcycle.MEAN_MOTORCYCLE_WIDTH
        length = Motorcycle.MEAN_MOTORCYCLE_LENGTH
        safe_gap = round(max(0.5, const.MIN_GAP_V0 + nprand.normal(0.0, Motorcycle.STD_MOTORCYCLE_LENGTH)), 2)
        vel_max = round(max(11.11, nprand.normal(13.89, 3.0)), 2)
        super(Motorcycle, self).__init__('motorcycle', width, length, vel, acc, route_list, dstn,
                                         vel_max=vel_max, safe_gap=safe_gap, left_bias=const.DLC_LEFT_BIAS)

    def react_to_bus_terminal(self, label, entrydist, exitdist, mean, std_dev, acc_t):
        return const.LARGE_NUMBER


class Tricycle(AbstractAgent):
    MEAN_TRICYCLE_WIDTH = 1.040  # c/o Engr. Pacson
    MEAN_TRICYCLE_LENGTH = 1.625  # c/o Engr. Pacson
    STD_TRICYCLE_LENGTH = 0.1862

    def __init__(self, vel, acc, route_list, dstn):
        width = Motorcycle.MEAN_MOTORCYCLE_WIDTH
        length = Motorcycle.MEAN_MOTORCYCLE_LENGTH
        safe_gap = round(max(0.5, const.MIN_GAP_V0 + nprand.normal(0.0, Tricycle.STD_TRICYCLE_LENGTH)), 2)
        vel_max = round(max(11.11, nprand.normal(13.89, 3.0)), 2)
        super(Tricycle, self).__init__('tricycle', width, length, vel, acc, route_list, dstn,
                                       vel_max=vel_max, safe_gap=safe_gap, left_bias=const.DLC_LEFT_BIAS)

    def react_to_bus_terminal(self, label, entrydist, exitdist, mean, std_dev, acc_t):
        return const.LARGE_NUMBER


class Truck(AbstractAgent):
    MEAN_TRUCK_WIDTH = 2.42
    MEAN_TRUCK_LENGTH = 13.6
    STD_TRUCK_LENGTH = 0.1668

    def __init__(self, vel, acc, route_list, dstn):
        width = Truck.MEAN_TRUCK_WIDTH
        length = Truck.MEAN_TRUCK_LENGTH
        safe_gap = round(max(0.5, const.MIN_GAP_V0 + nprand.normal(0.0, Truck.STD_TRUCK_LENGTH)), 2)
        vel_max = round(max(11.11, nprand.normal(13.89, 3.0)), 2)
        super(Truck, self).__init__('truck', width, length, vel, acc, route_list, dstn,
                                         vel_max=vel_max, safe_gap=safe_gap, left_bias=const.DLC_LEFT_BIAS)

    def react_to_bus_terminal(self, label, entrydist, exitdist, mean, std_dev, acc_t):
        return const.LARGE_NUMBER
