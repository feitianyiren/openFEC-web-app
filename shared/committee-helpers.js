module.exports = {
    buildCommitteeContext: function(results) {
        var i,
            len,
            committee,
            committees = [],
            type,
            designation,
            name,
            treasurer,
            state,
            party,
            organization;

        if (typeof results !== 'undefined') {
            len = results.length;
        }

        for (i = 0; i < len; i++) {
            committee = results[i].archive[0];
            committee.properties = results[i].properties;

            if (typeof committee.properties !== 'undefined' && typeof committee.properties.candidates !== 'undefined') {
                type = committee.properties.candidates[0].type_full || '';
                designation = committee.properties.candidates[0].designation_full || '';
            }

            if (typeof committee.treasurer !== 'undefined') {
                treasurer = committee.treasurer[0].name_full || '';
            }

            if (typeof committee.address !== 'undefined') {
                state = committee.address[0].state || '';
            }

            if (typeof committee.description !== 'undefined') {
                party = committee.description[0].party_full || '';
                name = committee.description[0].name || '';
                organization = committee.description[0].organization_type_full || '';
            }

            // don't output any undefineds
            committees.push({
                name: name || '',
                treasurer: treasurer || '',
                state: state || '',
                party: party || '',
                type: type || '',
                designation: designation || '',
                organization: organization || ''
            });
        }

        return committees;
    }
};
