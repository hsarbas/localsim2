import collections
import weakref
import time
import pandas as pd

from localsim.models.tso import const
from localsim.models import scene
from localsim.models.infra.control import concrete as control
from localsim.models.infra import survey_zone


class TSO(object):
    '''Maintains a set of stoplights and survey zones, then passes information from them over to the linear solver later on.'''

    def __init__(self, scene, vol_observer):
        self.scene = scene
        self.vol_observer = vol_observer
        self.controls = scene.controls
        self.survey_zones = scene.surveyors
        self.epoch = 0
        self.cell_map = {} # survey.id -> tuple
        self.ctm = collections.defaultdict(lambda: 0) # tuple -> value

        for road in self.controls:
            for control in self.controls[road]:
                control.controlled = True
                control.connect('recompute', self._signal_callback)

        for road in self.survey_zones:
            for survey in self.survey_zones[road]:
                # Get the hex portion of the ID
                survey_id = survey.id.split()[0][2:]
                self.cell_map[survey.id] = const.SURVEY_ZONE_MAPPING[survey_id]

    def _signal_callback(self, event, source, **extras):
        if event == 'recompute':
            # TODO: Store greentimes in each epoch (since it seems like the shit here is asynchronous)
            if self.epoch <= source.epoch:
                # New stoplight has reached new epoch

                # 1. Get the state of the network
                network_state = self.vol_observer.result()['log'] # survey.id --> volume (int)
                for k in network_state:
                    self.ctm[self.cell_map[k]] += network_state[k]

                print(self.ctm)
                print("Running solver...")
                time.sleep(10)
                self.epoch += 1
            print("Setting greentimes...")
            source.epoch += 1