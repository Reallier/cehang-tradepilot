import {workspaceReview} from './trade-review.mjs';
import {reviewJourneys} from './review-journeys.mjs';

// Only verified imported evidence contributes to progress; navigation and empty
// position snapshots cannot establish a fill, settlement or baseline match.
export function reviewProgress(trade,baseline){
 if(!trade)return {trade:false,synthetic:false,matched:0,closed:0};
 const packet=workspaceReview(trade,baseline),journeys=reviewJourneys(packet);
 return {trade:true,synthetic:trade.observation.classification==='synthetic_testnet_history',matched:journeys.items.filter(j=>j.comparison?.status==='compared').length,closed:journeys.items.filter(j=>j.state==='closed').length};
}
