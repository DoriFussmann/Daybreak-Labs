-- 005_post4me_seed.sql
-- Starter topics. Real, LinkedIn-usable lines for the two named client types.
-- Extend toward 50 in the console (Topics screen) or by adding rows here.
-- client_type values match the free-text presets used on the client record.

insert into post_topics (title, guidance, client_type) values
-- Franchise advisor (consultant / broker helping people buy a franchise)
('Why most first-time buyers pick the wrong franchise', 'Lead with a common mistake, not a pitch.', 'Franchise Advisor'),
('The real cost of a franchise beyond the franchise fee', 'Break down working capital, buildout, ramp.', 'Franchise Advisor'),
('Questions to ask a franchisor before you sign', 'Give three concrete questions, not a checklist dump.', 'Franchise Advisor'),
('Franchise vs. independent business: the honest tradeoffs', 'Balanced; no strawman of independents.', 'Franchise Advisor'),
('How to read an FDD without a lawyer', 'Point to Items 19, 20, 7; keep it plain.', 'Franchise Advisor'),
('Financing a first franchise: the options people miss', 'ROBS, SBA, HELOC, portfolio loans, tradeoffs.', 'Franchise Advisor'),
('Semi-absentee vs. owner-operator: which fits you', 'Frame around lifestyle and time, not returns only.', 'Franchise Advisor'),
('Red flags on a franchise discovery day', 'Specific tells; what a strong day looks like.', 'Franchise Advisor'),
('Why territory matters more than brand', 'Density, drive-time, demographics.', 'Franchise Advisor'),
('Matching personality to a franchise model', 'Sales-driven vs. systems-driven owners.', 'Franchise Advisor'),
('What a franchise consultant does (and does not) charge you for', 'Clear up the broker-fee misconception.', 'Franchise Advisor'),
('The validation call: how to actually use it', 'How to talk to existing franchisees.', 'Franchise Advisor'),
-- Franchise brand (franchisor marketing to prospective franchisees)
('What franchisees actually want from a franchisor', 'Support, not slogans; cite what you provide.', 'Franchise Brand'),
('The support systems that separate strong brands', 'Field ops, marketing, supply, training.', 'Franchise Brand'),
('Unit economics that make our model worth it', 'Show the shape of the P&L, not hype.', 'Franchise Brand'),
('Onboarding a franchisee in the first 90 days', 'Milestones a new owner should hit.', 'Franchise Brand'),
('Why validation calls close our best owners', 'Let existing owners carry the message.', 'Franchise Brand'),
('Multi-unit growth paths for our owners', 'From one unit to a portfolio.', 'Franchise Brand'),
('The role of the field consultant', 'What ongoing support looks like on the ground.', 'Franchise Brand'),
('Protecting brand consistency at scale', 'Standards without stifling operators.', 'Franchise Brand'),
-- Applies to all client types (null)
('A lesson from a business decision I got wrong', 'Personal, specific, ends with what changed.', null),
('What I wish someone told me before I started', 'Advice framed from lived experience.', null);
