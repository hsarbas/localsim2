# Hardcoded mapping of survey zone IDs to CTM cells (as tuples)
CELL_ZONE_MAPPING = {
    (0, 0, 0): [],
    (3, 0, 0): ['33', '4', '2f'],
    (3, 1, 0): ['32', '3', '2e'],
    (3, 2, 0): ['31', '2', '2d'],
    (2, 0, 0): ['2c'],
    (2, 1, 0): ['1'],
    (2, 2, 0): ['30'],
    (1, 0, 0): ['17', '5', '16'],
    (0, 0, 1): [],
    (3, 0, 1): ['27', 'a', '2b'],
    (3, 1, 1): ['26', '9', '2a'],
    (3, 2, 1): ['25', '8', '29'],
    (2, 0, 1): ['24'],
    (2, 1, 1): ['7'],
    (2, 2, 1): ['28'],
    (1, 0, 1): ['15', '6', '14'],
    (0, 0, 2): [],
    (3, 0, 2): ['1f', 'f', '23'],
    (3, 1, 2): ['1e', 'e', '22'],
    (3, 2, 2): ['1d', 'd', '21'],
    (2, 0, 2): ['1c'],
    (2, 1, 2): ['c'],
    (2, 2, 2): ['20'],
    (1, 0, 2): ['12', 'b', '13'],
    (0, 0, 3): [],
    (3, 0, 3): ['3b', '37', '1b'],
    (3, 1, 3): ['3a', '36', '1a'],
    (3, 2, 3): ['39', '35', '19'],
    (2, 0, 3): ['38'],
    (2, 1, 3): ['34'],
    (2, 2, 3): ['18'],
    (1, 0, 3): ['10', '0', '11'],
}

SURVEY_ZONE_MAPPING = {'30': (2, 2, 0), '22': (3, 1, 2), '2c': (2, 0, 0), '28': (2, 2, 1), '25': (3, 2, 1), '26': (3, 1, 1), '27': (3, 0, 1), '20': (2, 2, 2), '21': (3, 2, 2), '1e': (3, 1, 2), '23': (3, 0, 2), '24': (2, 0, 1), '29': (3, 2, 1), '1a': (3, 1, 3), '0': (1, 0, 3), '3': (3, 1, 0), '2': (3, 2, 0), '5': (1, 0, 0), '1d': (3, 2, 2), '7': (2, 1, 1), '1f': (3, 0, 2), '9': (3, 1, 1), '8': (3, 2, 1), '3a': (3, 1, 3), '1c': (2, 0, 2), '4': (3, 0, 0), 'a': (3, 0, 1), '6': (1, 0, 1), '39': (3, 2, 3), '12': (1, 0, 2), '3b': (3, 0, 3), '1b': (3, 0, 3), 'b': (1, 0, 2), '13': (1, 0, 2), 'd': (3, 2, 2), '11': (1, 0, 3), '10': (1, 0, 3), 'c': (2, 1, 2), '38': (2, 0, 3), '15': (1, 0, 1), '14': (1, 0, 1), '17': (1, 0, 0), 'f': (3, 0, 2), '19': (3, 2, 3), '32': (3, 1, 0), '31': (3, 2, 0), '16': (1, 0, 0), '37': (3, 0, 3), '36': (3, 1, 3), '35': (3, 2, 3), '34': (2, 1, 3), '2d': (3, 2, 0), '2e': (3, 1, 0), '2f': (3, 0, 0), '1': (2, 1, 0), '2a': (3, 1, 1), '2b': (3, 0, 1), '18': (2, 2, 3), '33': (3, 0, 0), 'e': (3, 1, 2)}

STOPLIGHT_MAPPING = {
    'approach0_lane1': (2,0,0),
    'approach0_lane2': (2,1,0),
    'approach0_lane3': (2,2,0),
    'approach1_lane1': (2,0,1),
    'approach1_lane2': (2,1,1),
    'approach1_lane3': (2,2,1),
    'approach2_lane1': (2,0,2),
    'approach2_lane2': (2,1,2),
    'approach2_lane3': (2,2,2),
    'approach3_lane1': (2,0,3),
    'approach3_lane2': (2,1,3),
    'approach3_lane3': (2,2,3),
}

LEFT_TURN           = 0
THROUGH_TURN        = 1
RIGHT_TURN          = 2

SOUTHBOUND          = 0
WESTBOUND           = 1
NORTHBOUND          = 2
EASTBOUND           = 3

PHASE_MAPPING = {
    (0,0,0): [(2, LEFT_TURN, WESTBOUND), (2, RIGHT_TURN, NORTHBOUND)], # WBL, NBR
    (0,0,1): [(2, THROUGH_TURN, EASTBOUND), (2, RIGHT_TURN, EASTBOUND)],
    (0,1,0): [(2, LEFT_TURN, SOUTHBOUND), (2, RIGHT_TURN, WESTBOUND)],
    (0,1,1): [(2, THROUGH_TURN, SOUTHBOUND), (2, RIGHT_TURN, SOUTHBOUND)],
    (1,0,0): [(2, LEFT_TURN, EASTBOUND), (2, RIGHT_TURN, SOUTHBOUND)],
    (1,0,1): [(2, THROUGH_TURN, WESTBOUND), (2, RIGHT_TURN, WESTBOUND)],
    (1,1,0): [(2, LEFT_TURN, NORTHBOUND), (2, RIGHT_TURN, EASTBOUND)],
    (1,1,1): [(2, THROUGH_TURN, NORTHBOUND), (2, RIGHT_TURN, NORTHBOUND)],
}

REVERSE_PHASE_MAPPING = {
    (2, LEFT_TURN, SOUTHBOUND): [(0,1,0)],
    (2, THROUGH_TURN, SOUTHBOUND): [(0,1,1)],
    (2, RIGHT_TURN, SOUTHBOUND): [(0,1,1), (1,0,0)],
    (2, LEFT_TURN, WESTBOUND): [(0,0,0)],
    (2, THROUGH_TURN, WESTBOUND): [(1,0,1)],
    (2, RIGHT_TURN, WESTBOUND): [(0,1,0), (1,0,1)],
    (2, LEFT_TURN, NORTHBOUND): [(1,1,0)],
    (2, THROUGH_TURN, NORTHBOUND): [(1,1,1)],
    (2, RIGHT_TURN, NORTHBOUND): [(0,0,0), (1,1,1)],
    (2, LEFT_TURN, EASTBOUND): [(1,0,0)],
    (2, THROUGH_TURN, EASTBOUND): [(0,0,1)],
    (2, RIGHT_TURN, EASTBOUND): [(1,1,0), (0,0,1)],
}

TIME_RANGE = 30
TIME_STEP = 2