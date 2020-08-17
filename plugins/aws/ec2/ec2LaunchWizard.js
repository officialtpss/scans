// TODO: MOVE TO EC2
var async = require('async');
var helpers = require('../../../helpers/aws');

module.exports = {
    title: 'EC2 LaunchWizard Security Groups',
    category: 'EC2',
    description: 'Ensures security groups created by the EC2 launch wizard are not used.',
    more_info: 'The EC2 launch wizard frequently creates insecure security groups that are exposed publicly. These groups should not be used and custom security groups should be created instead.',
    link: 'https://docs.aws.amazon.com/launchwizard/latest/userguide/launch-wizard-sap-security-groups.html',
    recommended_action: 'Delete the launch wizard security group and replace it with a custom security group.',
    apis: ['EC2:describeSecurityGroups'],

    run: function(cache, settings, callback) {
        var results = [];
        var source = {};
        var regions = helpers.regions(settings);
        async.each(regions.ec2, function(region, rcb){
            var describeSecurityGroups = helpers.addSource(cache, source,
                ['ec2', 'describeSecurityGroups', region]);

            if (!describeSecurityGroups) return rcb();

            if (describeSecurityGroups.err || !describeSecurityGroups.data) {
                helpers.addResult(results, 3,
                    'Unable to query for security groups: ' + helpers.addError(describeSecurityGroups), region);
                return rcb();
            }
     

            if (!describeSecurityGroups.data.length) {
                helpers.addResult(results, 0, 'No security groups present', region);
                return rcb();
            }

            for (var s in describeSecurityGroups.data) {
                var sg = describeSecurityGroups.data[s];
                // arn:aws:ec2:region:account-id:security-group/security-group-id
                var resource = 'arn:aws:ec2:' + region + ':' + sg.OwnerId + ':security-group/'+ sg.GroupId ;
                if (sg.GroupName.toLowerCase().startsWith('launch-wizard')) {
                    helpers.addResult(results, 2,
                        `${sg.GroupName} was created using the LaunchWizard`,
                        region, resource);
                }else {
                    helpers.addResult(results, 0,
                        `${sg.GroupName} was not created using the LaunchWizard`,
                        region, resource);
                }
            }
            rcb();
        }, function(){
            callback(null, results, source);
        });
    }
};
