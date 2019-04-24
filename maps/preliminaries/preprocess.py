import pandas as pd
import numpy as np
import os

currdir = os.getcwd()
#Regex captures the link name
regex_name = r'(([A-Z])\w+)'

#Iterate through all the results in the tmp folder
for filename in os.listdir(currdir + '/tmp'):
    print(filename)
    filename = currdir + '/tmp/' + filename
    #Only read the Speed sheet which contains Average Delay and Throughput
    df = pd.read_excel(filename, sheet_name='Speed')
    #Drop the 2nd, 3rd, 4th rows
    df.drop(df.index[0:3], inplace=True)
    print(df)
