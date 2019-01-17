## Developer's Guide

### Notes
- There are two main branches in the repo, master and develop.
- Do not code in the master branch. This just serves as a container of code that is run in the production.
- Do not code in the develop branch. This just serves as a container of our latest merged code.
- Create temporary local feature/fix branch then merge it to your local develop branch. Push your changes to the repo after you are done.
- Do not push to the repo any untested code.

### Summary
1. Create local branch for a feature/fix you want to code
2. Code in that branch
3. Merge your code in the develop branch
4. Push to the remote repo

###Detailed
1. Create local branch fro a feature/fix you want to code   
 ```
# Pull first to check latest version
$ git checkout develop
$ git pull

# Create your own local branch for a feature/fix
$ git checkout -b <feature/fix branch name> develop
```
2. Code in that branch
  ```
# Code, test, add, commit
```

3. Merge your code in the develop branch
  ```
# Swicth to develop
$ git checkout develop
# Check for latest version
$ git pull
# Merge your branch
$ git merge --no-ff <feature/fix branch name>
```

4. Push changes to the remote repo
  ```
# Make sure you are in the develop branch
$ git push
```