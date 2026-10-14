// Developer asset regression, separate from production gameplay tests.
// These limits catch the reproduced rigid-seam defect, not overall visual quality.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {auditRookRig} from './rook-rig-audit.mjs';

const model=version=>fileURLToPath(new URL(`../../assets/characters/rook-prototype-${version}.glb`,import.meta.url));
const corrected=await auditRookRig(model('v4'));
function seam(report){
 const result=report.materials.find(m=>/Canvas__seam_thread/.test(m.name));
 assert.ok(result,'The audit must identify the garment seam mesh.');
 assert.ok(result.vertices>0,'The seam check must inspect actual vertices.');
 return result;
}
function blendedSeams(report){
 const mesh=seam(report),counts=mesh.verticesByInfluenceCount;
 assert.equal(counts[0],0,'Seam vertices must have usable skin weights.');
 assert.ok((counts[2]+counts[3]+counts[4])/mesh.vertices>=.99,'At least 99% of seam vertices must retain blended garment weights.');
}
function tracking(report,bone,max,mean){
 const probe=report.probes.find(p=>p.bone===bone),measurement=probe?.seamTracking;
 assert.ok(measurement,`Missing attachment tracking probe for ${bone}.`);
 assert.equal(measurement.vertices,seam(report).vertices,'Tracking must inspect the whole seam mesh.');
 assert.ok(Number.isFinite(measurement.maxDistanceChange)&&measurement.maxDistanceChange<=max,`${bone}: maximum nearest-canvas distance change exceeds ${max}m.`);
 assert.ok(Number.isFinite(measurement.meanDistanceChange)&&measurement.meanDistanceChange<=mean,`${bone}: mean nearest-canvas distance change exceeds ${mean}m.`);
}
test('v4 garment seams retain blended skin weights',()=>blendedSeams(corrected));
test('v4 chest rotation keeps seam tracking within 10mm maximum and 1mm mean',()=>tracking(corrected,'spine01',.010,.001));
test('v4 left and right arm lowering keep seam tracking within 5mm maximum and 0.5mm mean',()=>{
 tracking(corrected,'upperarm01L',.005,.0005);
 tracking(corrected,'upperarm01R',.005,.0005);
});
test('the same guards reject the actual v3 rigid-seam regression',async()=>{
 const original=await auditRookRig(model('v3'));
 assert.throws(()=>blendedSeams(original),/blended garment weights/);
 assert.throws(()=>tracking(original,'spine01',.010,.001),/maximum nearest-canvas/);
 assert.throws(()=>tracking(original,'upperarm01L',.005,.0005),/maximum nearest-canvas/);
 assert.throws(()=>tracking(original,'upperarm01R',.005,.0005),/maximum nearest-canvas/);
});
