import os, time
import pyexcel as p
import sys

def main(sname):
    print "Pupa!"
    filelist = []
    for file in os.listdir("TO-PROCESS"):
#        if file.endswith(".txt"):
        if file.endswith(".txt"):
            filelist.append(os.path.join("TO-PROCESS", file))

    f_savename = "Global-results-part2-"+str(time.time())+".xls"
    header1 = ["", "k = 1", "k = 1", "k = 1", "k = 1", "k = 1", "k = 1", "k = 1", "k = 1",
                    "k = 2", "k = 2", "k = 2", "k = 2", "k = 2", "k = 2", "k = 2", "k = 2",
                    "k = 3", "k = 3", "k = 3", "k = 3", "k = 3", "k = 3", "k = 3", "k = 3",
                    "k = 4", "k = 4", "k = 4", "k = 4", "k = 4", "k = 4", "k = 4", "k = 4",
                    "k = 5", "k = 5", "k = 5", "k = 5", "k = 5", "k = 5", "k = 5", "k = 5",
                    "k = 6", "k = 6", "k = 6", "k = 6", "k = 6", "k = 6", "k = 6", "k = 6",
                    "k = 7", "k = 7", "k = 7", "k = 7", "k = 7", "k = 7", "k = 7", "k = 7",
                    "k = 8", "k = 8", "k = 8", "k = 8", "k = 8", "k = 8", "k = 8", "k = 8",
                    "k = 9", "k = 9", "k = 9", "k = 9", "k = 9", "k = 9", "k = 9", "k = 9"]
    header2 = ["", "t_greedy", "r_greedy", "t_backtrack", "r_backtrack", "t_global", "r_global", "num_global", "t_global - t_greedy",
                    "t_greedy", "r_greedy", "t_backtrack", "r_backtrack", "t_global", "r_global", "num_global", "t_global - t_greedy",
                    "t_greedy", "r_greedy", "t_backtrack", "r_backtrack", "t_global", "r_global", "num_global", "t_global - t_greedy",
                    "t_greedy", "r_greedy", "t_backtrack", "r_backtrack", "t_global", "r_global", "num_global", "t_global - t_greedy",
                    "t_greedy", "r_greedy", "t_backtrack", "r_backtrack", "t_global", "r_global", "num_global", "t_global - t_greedy",
                    "t_greedy", "r_greedy", "t_backtrack", "r_backtrack", "t_global", "r_global", "num_global", "t_global - t_greedy",
                    "t_greedy", "r_greedy", "t_backtrack", "r_backtrack", "t_global", "r_global", "num_global", "t_global - t_greedy",
                    "t_greedy", "r_greedy", "t_backtrack", "r_backtrack", "t_global", "r_global", "num_global", "t_global - t_greedy",
                    "t_greedy", "r_greedy", "t_backtrack", "r_backtrack", "t_global", "r_global", "num_global", "t_global - t_greedy"]
    save_arr = [header1, header2, ["Average"]]

    f_write = open(sname, "w")
    
    for fname in filelist:
        prefx, result = extractData(fname, sname)
        print str(result)+" | "+prefx
        f_write.write(prefx)
        save_arr.append(result)

    p.save_as(array=save_arr,dest_file_name=f_savename)

def extractData(fname, sname):
    pref_passed = False
    tmp_array = []
    f_read = open(fname, "r")

    for line in f_read:
        if "Prefix" in line:
            prefx = line[9:]
            tmp_array.append(prefx)
            pref_passed = True
        elif "Greedy" in line:
            assert pref_passed is True
            modes = line.split("||")
            m_greedy, m_global, m_backtrack = modes[0], modes[1], modes[2]
            arr_greedy, arr_global, arr_backtrack = m_greedy.split("|"), m_global.split("|"), m_backtrack.split("|")
            t_greedy, r_greedy = float(arr_greedy[1][5:]), float(arr_greedy[2][5:])
            t_global, r_global = float(arr_global[1][5:]), float(arr_global[2][5:])
            t_backtrack, r_backtrack = float(arr_backtrack[1][5:]), float(arr_greedy[2][5:])+float(arr_backtrack[2][5:])
            num_global, t_greedy_global_diff = len(arr_global[0].split(',')), t_greedy - t_global
            tmp_array.extend([t_greedy, r_greedy, t_backtrack, r_backtrack, t_global, r_global, num_global, t_greedy_global_diff])
        else:
            pass

    f_read.close()
    return prefx, tmp_array

if __name__ == '__main__':
    assert len(sys.argv) == 2
    sname = sys.argv[1]
    main(sname)
