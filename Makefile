DEPLOY_PATH = il-2020-precinct-maps-stg

.PHONY: deploy-site
deploy-site:
	aws s3 sync dist/ s3://$(S3_BUCKET)/$(DEPLOY_PATH) --acl=public-read --cache-control "public, max-age=31536000" --size-only --exclude "*.html" --exclude "manifest.json" --exclude "style.json"
	aws s3 sync dist/ s3://$(S3_BUCKET)/$(DEPLOY_PATH) --acl=public-read --cache-control "public, max-age=0, must-revalidate" --size-only --exclude "*" --include "*.html" --include "manifest.json" --include "style.json"
	aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_ID) --paths "/$(DEPLOY_PATH)/*"

.PHONY: deploy-tiles
deploy-tiles:
	aws s3 cp tiles/vector/ s3://$(S3_BUCKET)/$(DEPLOY_PATH)/tiles --recursive --acl=public-read --cache-control "public, max-age=86400" --content-encoding=gzip
	aws s3 cp tiles/raster/ s3://$(S3_BUCKET)/$(DEPLOY_PATH)/tiles --recursive --acl=public-read --cache-control "public, max-age=86400"
	aws cloudfront create-invalidation --distribution-id $(CLOUDFRONT_ID) --paths "/$(DEPLOY_PATH)/*"

tiles/raster/%: data/points/%.csv
	npm run env -- node -r esm ./scripts/points-to-raster-tiles.js $< $@

data/points/il-constitution.csv: data/points/il-constitution-yes.csv data/points/il-constitution-no.csv
	xsv cat rows $^ > $@

data/points/us-president.csv: data/points/us-president-dem.csv data/points/us-president-rep.csv data/points/us-president-otr.csv
	xsv cat rows $^ > $@

data/points/%.csv: data/points/il.geojson
	aggspread -agg $< -spread $< -prop '$*' -output - | \
	mapshaper -i - format=csv -points -each 'vote = "$*"' -o $@

data/points/il.geojson: data/precincts/il.geojson
	mapshaper -i $< \
	-filter 'this.properties["il-constitution-yes"] !== null && this.properties["us-president-dem"] !== null' remove-empty \
	-each 'this.properties["us-president-otr"] = this.properties["us-president-votes"] - this.properties["us-president-dem"] - this.properties["us-president-rep"]' \
	-o $@

tiles/vector: data/precincts/il.mbtiles
	mkdir $@
	tile-join --no-tile-size-limit --force -e $@ $<

data/precincts/il.mbtiles: data/precincts/il.geojson
	tippecanoe \
	--simplification=10 \
	--simplify-only-low-zooms \
	--minimum-zoom=5 \
	--maximum-zoom=11 \
	--no-tile-stats \
	--generate-ids \
	--detect-shared-borders \
	--grid-low-zooms \
	--coalesce-smallest-as-needed \
	--accumulate-attribute=registered:sum \
	--accumulate-attribute=ballots:sum \
	--accumulate-attribute=us-president-dem:sum \
	--accumulate-attribute=us-president-rep:sum \
	--accumulate-attribute=us-president-votes:sum \
	--accumulate-attribute=il-constitution-yes:sum \
	--accumulate-attribute=il-constitution-no:sum \
	--accumulate-attribute=il-constitution-votes:sum \
	--force \
	-L precincts:$< -o $@
