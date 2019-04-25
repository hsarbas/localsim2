import collections
import weakref

from localsim.models import scene
from localsim.models.infra.control import concrete as control
from localsim.models.infra import survey_zone


class TSO(object):
    '''Maintains a set of stoplights and survey zones, then passes information from them over to the linear solver later on.'''

    def __init__(self, scene):
        print("HAII DOMO")
        self.scene = scene
        self.controls = scene.controls
        self.survey_zones = scene.surveyors

        for road in self.controls:
            for control in self.controls[road]:
                control.controlled = True

        for road in self.survey_zones:
            for survey in self.survey_zones[road]:
                pass

        # Later on, hardcode a mapping of survey zones to cells in the CTM