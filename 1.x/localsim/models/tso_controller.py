import collections
import weakref
import time

from localsim.models import scene
from localsim.models.infra.control import concrete as control
from localsim.models.infra import survey_zone


class TSO(object):
    '''Maintains a set of stoplights and survey zones, then passes information from them over to the linear solver later on.'''

    # Hardcoded mapping of survey zone IDs to CTM cells (as tuples)
    survey_zone_mapping = {
        (0,0,0): [],
        (3,0,0): ['33', '4', '2f'],
        (3,1,0): ['32', '3', '2e'],
        (3,2,0): ['31', '2', '2d'],
        (2,0,0): ['2c'],
        (2,1,0): ['1'],
        (2,2,0): ['30'],
        (1,0,0): ['17', '5', '16'],
        (0,0,1): [],
        (3,0,1): ['27', 'a', '2b'],
        (3,1,1): ['26', '9', '2a'],
        (3,2,1): ['25', '8', '29'],
        (2,0,1): ['28'],
        (2,1,1): ['7'],
        (2,2,1): ['24'],
        (1,0,1): ['15', '6', '14'],
        (0,0,2): [],
        (3,0,2): ['1f', 'f', '23'],
        (3,1,2): ['1e', 'e', '22'],
        (3,2,2): ['1d', 'd', '21'],
        (2,0,2): ['1c'],
        (2,1,2): ['c'],
        (2,2,2): ['20'],
        (1,0,2): ['12', 'b', '13'],
        (0,0,3): [],
        (3,0,3): ['3b', '37', '1b'],
        (3,1,3): ['3a', '36', '1a'],
        (3,2,3): ['39', '35', '19'],
        (2,0,3): ['38'],
        (2,1,3): ['34'],
        (2,2,3): ['18'],
        (1,0,3): ['10', '0', '11'],
    }

    def __init__(self, scene):
        print("HAII DOMO")
        self.scene = scene
        self.controls = scene.controls
        self.survey_zones = scene.surveyors
        self.epoch = 0

        for road in self.controls:
            for control in self.controls[road]:
                control.controlled = True
                control.connect('recompute', self._signal_callback)

        for road in self.survey_zones:
            for survey in self.survey_zones[road]:
                pass

        # Later on, hardcode a mapping of survey zones to cells in the CTM
        self.cell_map = weakref.WeakKeyDictionary() # survey_zone -> tuple
        self.ctm = {} # tuple -> value

    def _signal_callback(self, event, source, **extras):
        if event == 'recompute':
            # TODO: Store greentimes in each epoch (since it seems like the shit here is asynchronous)
            if self.epoch <= source.epoch:
                # New stoplight has reached new epoch
                print("Running solver...")
                time.sleep(10)
                self.epoch += 1
            print("Setting greentimes...")
            source.epoch += 1