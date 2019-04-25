import collections
import weakref
import time

from localsim.models import scene
from localsim.models.infra.control import concrete as control
from localsim.models.infra import survey_zone


class TSO(object):
    '''Maintains a set of stoplights and survey zones, then passes information from them over to the linear solver later on.'''

    # Hardcoded mapping of survey zone IDs to CTM cells (as tuples)

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
        self.ctm = {} # key -> key -> value

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