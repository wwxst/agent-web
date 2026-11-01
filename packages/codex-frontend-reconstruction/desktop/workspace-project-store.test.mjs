import test from "node:test";
import assert from "node:assert/strict";
import {mkdtemp,mkdir,symlink,rm,writeFile,readFile,stat,realpath} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {
  WORKSPACE_PROJECTS_FILENAME,addWorkspaceProject,getWorkspaceProject,
  listWorkspaceProjects,markWorkspaceProjectOpened,removeWorkspaceProject,
  readWorkspaceProjects,
} from "./workspaceProjectStore.cjs";

test("workspace projects are persisted as native-granted roots and renderer summaries redact paths",async()=>{
  const userData=await mkdtemp(join(tmpdir(),"agent-web-project-store-"));
  const root=await mkdtemp(join(tmpdir(),"agent-web-project-root-"));
  try{
    await mkdir(join(root,"src"));
    const first=addWorkspaceProject(userData,root,{
      clock:()=> "2026-11-01T10:00:00.000Z",
    });
    assert.equal(first.created,true);
    assert.equal(first.project.name,root.split(/[\\/]/u).at(-1));
    assert.equal(first.project.path,await realpath(root));
    assert.ok(first.project.id);
    assert.deepEqual(listWorkspaceProjects(userData),[{
      id:first.project.id,name:first.project.name,
      createdAt:"2026-11-01T10:00:00.000Z",
      lastOpenedAt:"2026-11-01T10:00:00.000Z",
    }]);
    assert.equal(JSON.stringify(listWorkspaceProjects(userData)).includes(root),false);
    const saved=JSON.parse(await readFile(join(userData,WORKSPACE_PROJECTS_FILENAME),"utf8"));
    assert.equal(saved.version,1);
    assert.equal(saved.projects[0].path,first.project.path);
    const storedStat=await stat(join(userData,WORKSPACE_PROJECTS_FILENAME));
    assert.equal(storedStat.isFile(),true);
    if(process.platform!=="win32")assert.equal(storedStat.mode&0o077,0);
  }finally{
    await rm(userData,{recursive:true,force:true});
    await rm(root,{recursive:true,force:true});
  }
});

test("adding the same canonical directory is idempotent and retains its stable project id",async()=>{
  const userData=await mkdtemp(join(tmpdir(),"agent-web-project-dedupe-"));
  const root=await mkdtemp(join(tmpdir(),"agent-web-project-root-"));
  const alias=join(userData,"alias");
  try{
    const first=addWorkspaceProject(userData,root);
    const duplicate=addWorkspaceProject(userData,root);
    assert.equal(first.created,true);
    assert.equal(duplicate.created,false);
    assert.equal(duplicate.project.id,first.project.id);
    try{await symlink(root,alias,"dir");}
    catch(error){if(!["EPERM","EACCES","ENOSYS"].includes(error?.code))throw error;}
    if(await import("node:fs/promises").then(fs=>fs.lstat(alias).then(()=>true).catch(()=>false))){
      const aliasResult=addWorkspaceProject(userData,alias);
      assert.equal(aliasResult.created,false);
      assert.equal(aliasResult.project.id,first.project.id);
    }
    assert.equal(listWorkspaceProjects(userData).length,1);
  }finally{
    await rm(userData,{recursive:true,force:true});
    await rm(root,{recursive:true,force:true});
  }
});

test("project activation metadata is updated and removing a project is stable",async()=>{
  const userData=await mkdtemp(join(tmpdir(),"agent-web-project-lifecycle-"));
  const root=await mkdtemp(join(tmpdir(),"agent-web-project-root-"));
  try{
    const added=addWorkspaceProject(userData,root,{clock:()=> "2026-11-01T10:00:00.000Z"});
    assert.equal(getWorkspaceProject(userData,added.project.id)?.path,added.project.path);
    assert.equal(markWorkspaceProjectOpened(userData,added.project.id,{
      clock:()=> "2026-11-01T11:00:00.000Z",
    }),true);
    assert.equal(listWorkspaceProjects(userData)[0]?.lastOpenedAt,"2026-11-01T11:00:00.000Z");
    assert.equal(removeWorkspaceProject(userData,added.project.id),true);
    assert.equal(removeWorkspaceProject(userData,added.project.id),false);
    assert.equal(getWorkspaceProject(userData,added.project.id),null);
    assert.deepEqual(listWorkspaceProjects(userData),[]);
  }finally{
    await rm(userData,{recursive:true,force:true});
    await rm(root,{recursive:true,force:true});
  }
});

test("project store rejects malformed records rather than silently discarding registered roots",async()=>{
  const userData=await mkdtemp(join(tmpdir(),"agent-web-project-corrupt-"));
  try{
    await writeFile(join(userData,WORKSPACE_PROJECTS_FILENAME),JSON.stringify({
      version:1,projects:[{id:"not-an-id",name:"unsafe",path:resolve("/tmp"),device:"1",inode:"2",
        createdAt:"2026-11-01T10:00:00.000Z",lastOpenedAt:null}],
    }));
    assert.throws(()=>readWorkspaceProjects(userData),/WORKSPACE_PROJECT_STORE_INVALID/);
    assert.throws(()=>addWorkspaceProject(userData,resolve("/tmp")),/WORKSPACE_PROJECT_STORE_INVALID/);
  }finally{await rm(userData,{recursive:true,force:true});}
});

test("project store refuses non-directories and non-absolute paths",async()=>{
  const userData=await mkdtemp(join(tmpdir(),"agent-web-project-invalid-"));
  const root=await mkdtemp(join(tmpdir(),"agent-web-project-root-"));
  const file=join(root,"file.txt");
  try{
    await writeFile(file,"not a directory");
    assert.throws(()=>addWorkspaceProject(userData,"relative"),/WORKSPACE_PROJECT_DIRECTORY_INVALID/);
    assert.throws(()=>addWorkspaceProject(userData,file),/WORKSPACE_PROJECT_DIRECTORY_INVALID/);
    assert.deepEqual(listWorkspaceProjects(userData),[]);
  }finally{
    await rm(userData,{recursive:true,force:true});
    await rm(root,{recursive:true,force:true});
  }
});
