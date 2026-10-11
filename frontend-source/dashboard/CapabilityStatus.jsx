import React from 'react';
import {CAPABILITIES} from '../../server/capabilities.mjs';
const impl={implemented:'已实现',planned:'待扩展',disabled:'关闭'},real={limited_verified:'有限历史样本通过',market_read_verified:'市场读取已验证',pending:'待真实链端验收',not_applicable:'不适用'};
export function CapabilityStatus(){return <section className="tp-panel"><h2>当前能力与验证边界</h2><div className="table-scroll"><table className="plain-table"><thead><tr><th>能力</th><th>实现</th><th>自动回归</th><th>测试网</th><th>边界</th></tr></thead><tbody>{CAPABILITIES.map(c=><tr key={c.id}><td>{c.label}</td><td>{impl[c.implementation]}</td><td>{c.automated?'有覆盖':'未覆盖'}</td><td>{real[c.testnet]}</td><td>{c.boundary}</td></tr>)}</tbody></table></div></section>;}
