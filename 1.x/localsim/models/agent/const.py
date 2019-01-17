DT = 0.25  # change in time for simulation in seconds
STOP_DIST = 1  # minimum distance between two cars in meters
TIME_REACT = 2.5  # reaction time in s
B_SAFE = 4.0  # 3.604  # max safe deceleration for MOBIL, in m/s^2
A_THRESH = 0.3  # acceleration threshold for MOBIL simulation in m/s^2
P = 0.554  # politeness factor
V_DIFF = 0.2778  # threshold for difference in velocity of a car and its front car - 5 kph
EPSILON = 0.460203  # imperfection constant for krauss

# idm parameters
VEL_DES = 23.33
SAFE_TIME_HEADWAY = 1.6
ACC_EXP = 4
S1 = 0

DISPATCH_REACH_MAX = 5.0  # in meters, maximum area of concern for spacial clearance. magic number

# SSD Constants
PRT = 2.5  # perception-reaction time
G = 9.8  # acceleration due to gravity
F = 0.40  # coefficient of friction between car tire and asphalt

LEFT = -1
THROUGH = 0
RIGHT = 1

MLC = 'mlc'
DLC = 'dlc'

MIN_SIGHT_DIST = 15.0  # minimum sight distance, in meters
DWELL_TIME = 5.0  # time needed for minor vehicle to wait before deciding conflict resolution (in seconds)
LARGE_NUMBER = 10000
MIN_GAP_V0 = 1.0  # minimum distance between two cars in meters at v = 0

NORMAL_MERGE = 'M'
COURTESY_MERGE = 'C'
FORCED_MERGE = 'F'

DLC_LEFT_BIAS = 0.2
DLC_RIGHT_BIAS = 0.3

LC_DELAY = 5  # seconds
STOP_DELAY = 3  # seconds
ALMOST_STOP = 0.75  # considered stop in m/s

# to be used when input flow rate is 0
ALMOST_ZERO = 0.00001

AGENT_MODELS = {
    'bus': 'localsim.models.agent.concrete.Bus',
    'jeep': 'localsim.models.agent.concrete.Jeep',
    'car': 'localsim.models.agent.concrete.Car',
    'motorcycle': 'localsim.models.agent.concrete.Motorcycle',
    'truck': 'localsim.models.agent.concrete.Truck',
    'tricycle': 'localsim.models.agent.concrete.Tricycle'
}

CAR_DEFAULT_DIST = 0.167
BUS_DEFAULT_DIST = 0.167
JEEP_DEFAULT_DIST = 0.167
MOTORCYCLE_DEFAULT_DIST = 0.167
TRICYCLE_DEFAULT_DIST = 0.167
TRUCK_DEFAULT_DIST = 0.165

DYNAMIC_ROUTING = 'dynamic'
STATIC_ROUTING = 'static'
